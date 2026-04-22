import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRateCardStore } from "@/stores/rateCardStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogProvider } from "@/components/ui/dialog";
import { Trash2, Loader2, ImagePlus, CheckCircle, Search, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPKR } from "@/lib/formatters";
import type { Grade } from "@/types";

interface ShopItem {
  id: string;
  name: string;
  english_name: string | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

const CATEGORIES = [
  { key: "all",    label: "All Products" },
  { key: "dal",    label: "Dal" },
  { key: "chawal", label: "Chawal" },
  { key: "channe", label: "Channa" },
  { key: "lobiya", label: "Lobiya" },
  { key: "bajra",  label: "Bajra" },
  { key: "others", label: "Others" },
];

const GRADES: Grade[] = ["A+", "A", "B", "C"];

export default function ManageItems() {
  const { rates, fetchRates, updateRate } = useRateCardStore();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [newName, setNewName] = useState("");
  const [newEnglishName, setNewEnglishName] = useState("");
  const [newCategory, setNewCategory] = useState("others");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchItems();
    fetchRates();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("item_names")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!error && data) setItems(data as ShopItem[]);
    setLoading(false);
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item);
    setNewName(item.name);
    setNewEnglishName(item.english_name || "");
    setNewCategory(item.category || "others");
    
    // Load existing prices
    const itemPrices: Record<string, string> = {};
    GRADES.forEach(grade => {
      const rate = rates.find(r => r.item_name === item.name && r.grade === grade);
      if (rate) itemPrices[grade] = String(rate.price_per_kg);
    });
    setPrices(itemPrices);
  };

  const handleAddNewList = () => {
    const newItem: ShopItem = {
      id: "NEW", name: "", english_name: "", category: "others", image_url: null, is_active: true
    };
    handleEdit(newItem);
  };

  const handleSaveItem = async () => {
    if (!newName.trim()) {
      toast.error("Urdu/Native Name is required");
      return;
    }
    setSaving(true);
    
    let currentId = editingItem?.id;

    if (currentId === "NEW") {
      // Insert new
      const { data, error } = await supabase
        .from("item_names")
        .insert({ name: newName, english_name: newEnglishName || null, category: newCategory })
        .select()
        .single();
        
      if (error) {
        toast.error("Failed to add: " + error.message);
        setSaving(false);
        return;
      }
      currentId = data.id;
      // Also update prices if set
      for (const grade of GRADES) {
         if (prices[grade]) await updateRate(newName, grade, Number(prices[grade]));
      }
      toast.success("Item added successfully");
    } else if (currentId) {
      // Update existing
      const { error } = await supabase
        .from("item_names")
        .update({ name: newName, english_name: newEnglishName || null, category: newCategory })
        .eq("id", currentId);
        
      if (error) {
        toast.error("Failed to update: " + error.message);
        setSaving(false);
        return;
      }
      // Update prices for existing item name
      for (const grade of GRADES) {
         if (prices[grade]) await updateRate(newName, grade, Number(prices[grade]));
      }
      toast.success("Item updated successfully");
    }

    setEditingItem(null);
    setSaving(false);
    fetchItems();
    fetchRates();
  };

  const handleDeactivate = async (id: string) => {
    if(!confirm("Are you sure you want to remove this item?")) return;
    const { error } = await supabase.from("item_names").update({ is_active: false }).eq("id", id);
    if (!error) {
      toast.success("Item removed");
      fetchItems();
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editingItem || editingItem.id === "NEW") return;
    const file = e.target.files[0];
    
    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `product-${editingItem.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
    
    if (uploadError) {
      toast.error("Failed to upload image.");
      setUploadingImage(false);
      return;
    }
    
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    
    const { error: updateError } = await supabase
      .from('item_names')
      .update({ image_url: data.publicUrl })
      .eq('id', editingItem.id);

    if (updateError) {
      toast.error("Image uploaded but failed to save to item.");
    } else {
      toast.success("Image updated successfully!");
      setEditingItem(prev => prev ? { ...prev, image_url: data.publicUrl } : prev);
      fetchItems();
    }
    
    setUploadingImage(false);
  };

  const filtered = items.filter(i => 
    !search || 
    i.name.includes(search) || 
    (i.english_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Products & Pricing</h1>
          <p className="text-sm text-muted-foreground">Add products, configure their English/Urdu names, categories, store images, and rate card pricing.</p>
        </div>
        <Button onClick={handleAddNewList}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            value={search} onChange={(e) => setSearch(e.target.value)} 
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Urdu Name</TableHead>
              <TableHead>English Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Lowest Price (A+ to C)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No products found.</TableCell></TableRow>
            ) : (
              filtered.map(item => {
                const itemRates = rates.filter(r => r.item_name === item.name).map(r => r.price_per_kg);
                const lowestPrice = itemRates.length > 0 ? Math.min(...itemRates) : null;
                const catLabel = CATEGORIES.find(c => c.key === item.category)?.label || "Others";
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center border">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium" dir="rtl">{item.name}</TableCell>
                    <TableCell>{item.english_name || "—"}</TableCell>
                    <TableCell>{catLabel}</TableCell>
                    <TableCell className="text-primary font-medium">{lowestPrice ? `Starts Rs. ${lowestPrice}` : "Not Set"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Edit / Set Prices</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeactivate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem?.id === "NEW" ? "Add New Product" : "Edit Product Details"}</DialogTitle>
            <DialogDescription>Update the product listing information</DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-6 pt-4">
              {editingItem.id !== "NEW" && (
                <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-xl border border-dashed">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-background border flex items-center justify-center relative group">
                     {editingItem.image_url ? (
                       <img src={editingItem.image_url} alt="Product" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex flex-col items-center text-muted-foreground">
                         <Package className="h-8 w-8 opacity-40 mb-1" />
                         <span className="text-[10px]">No image</span>
                       </div>
                     )}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                          {uploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Change"}
                        </Button>
                     </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={uploadImage} />
                  <p className="text-xs text-muted-foreground text-center">Recommended aspect ratio: 1:1 (Square). <br/>We suggest high quality real photographs.</p>
                </div>
              )}

              {editingItem.id === "NEW" && (
                <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded border border-amber-200">
                  You can upload a product image after saving this newly created product.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Urdu Name (Primary ID) *</Label>
                  <Input dir="rtl" value={newName} onChange={e => setNewName(e.target.value)} placeholder="دال مسور" />
                </div>
                <div className="space-y-2">
                  <Label>English Name</Label>
                  <Input value={newEnglishName} onChange={e => setNewEnglishName(e.target.value)} placeholder="Dal Masoor" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Shop Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-sm mb-3">Rate Card Pricing</h4>
                <div className="grid grid-cols-4 gap-3">
                  {GRADES.map(grade => (
                    <div key={grade} className="space-y-1">
                      <Label className="text-xs">Grade {grade} (PKR)</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        value={prices[grade] || ""} 
                        onChange={e => setPrices({...prices, [grade]: e.target.value})}
                        placeholder="0" 
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">These prices will immediately update the market Rate Card globally.</p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button onClick={handleSaveItem} disabled={saving || uploadingImage}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
