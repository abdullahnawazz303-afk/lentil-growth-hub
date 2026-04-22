import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Loader2, Image as ImageIcon, ArrowUp, ArrowDown,
  Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function HeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("/shop");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchSlides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true });
    setSlides((data || []) as HeroSlide[]);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setTitle(""); setSubtitle(""); setLinkUrl("/shop");
    setImageFile(null); setImagePreview(null);
    setEditingSlide(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEditDialog = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setTitle(slide.title);
    setSubtitle(slide.subtitle || "");
    setLinkUrl(slide.link_url);
    setImagePreview(slide.image_url);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!imageFile && !editingSlide) { toast.error("Please select an image"); return; }

    setUploading(true);
    let imageUrl = editingSlide?.image_url || "";

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `hero/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { upsert: true });

      if (uploadError) {
        toast.error("Failed to upload image: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      imageUrl = urlData?.publicUrl || imageUrl;
    }

    setSaving(true);
    
    if (editingSlide) {
      const { error: updateError } = await supabase
        .from("hero_slides")
        .update({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          image_url: imageUrl,
          link_url: linkUrl.trim() || "/shop",
        })
        .eq("id", editingSlide.id);

      if (updateError) {
        toast.error("Failed to update slide: " + updateError.message);
      } else {
        toast.success("Slide updated!");
        setOpen(false);
        resetForm();
        fetchSlides();
      }
    } else {
      const nextOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("hero_slides").insert({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || "/shop",
        sort_order: nextOrder,
        is_active: true,
      });

      if (insertError) {
        toast.error("Failed to save slide: " + insertError.message);
      } else {
        toast.success("Slide added successfully!");
        setOpen(false);
        resetForm();
        fetchSlides();
      }
    }

    setSaving(false);
    setUploading(false);
  };

  const toggleActive = async (slide: HeroSlide) => {
    await supabase.from("hero_slides").update({ is_active: !slide.is_active }).eq("id", slide.id);
    fetchSlides();
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from("hero_slides").delete().eq("id", id);
    toast.success("Slide deleted");
    fetchSlides();
  };

  const moveSlide = async (slide: HeroSlide, dir: "up" | "down") => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;

    const other = slides[swapIdx];
    await supabase.from("hero_slides").update({ sort_order: other.sort_order }).eq("id", slide.id);
    await supabase.from("hero_slides").update({ sort_order: slide.sort_order }).eq("id", other.id);
    fetchSlides();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hero Slides</h1>
          <p className="text-sm text-muted-foreground">
            Manage the homepage image slider. Changes appear live on the website.
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Slide</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSlide ? "Edit Hero Slide" : "New Hero Slide"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Image upload */}
              <div className="space-y-2">
                <Label>Slide Image {editingSlide ? "(Optional: Replace)" : "*"}</Label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-muted border">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 shadow-lg"
                      onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="h-10 w-10 text-primary/30" />
                    <span className="text-sm font-medium">Click to upload image</span>
                    <span className="text-xs">Recommended: 1600×900px or wider</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pakistan's Trusted Pulse Factory" />
              </div>
              <div className="space-y-2">
                <Label>Subtitle (optional)</Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short description for this slide" />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/shop" />
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={uploading || saving}
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {editingSlide ? "Updating image..." : "Uploading image..."}</>
                ) : saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  editingSlide ? "Save Changes" : "Add Slide"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading slides...
        </div>
      ) : slides.length === 0 ? (
        <div className="border rounded-xl p-10 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-primary/20" />
          <p className="font-medium">No slides yet</p>
          <p className="text-sm mt-1">The homepage uses default slides until you add some here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, i) => (
            <div key={slide.id} className="rounded-xl border bg-card overflow-hidden flex flex-col sm:flex-row gap-0">
              {/* Image preview */}
              <div className="w-full sm:w-48 h-36 shrink-0 overflow-hidden bg-muted">
                <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
              </div>
              {/* Info */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{slide.title}</h3>
                      {slide.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{slide.subtitle}</p>}
                    </div>
                    <Badge variant={slide.is_active ? "default" : "secondary"}>
                      {slide.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{slide.link_url}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => moveSlide(slide, "up")} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => moveSlide(slide, "down")} disabled={i === slides.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(slide)}>
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(slide)}>
                    {slide.is_active ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Show</>}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => deleteSlide(slide.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
