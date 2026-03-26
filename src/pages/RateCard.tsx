import { useState, useEffect } from "react";
import { useRateCardStore } from "@/stores/rateCardStore";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatDate } from "@/lib/formatters";
import type { Grade } from "@/types";

const GRADES: Grade[] = ["A+", "A", "B", "C"];

const RateCard = () => {
  const { rates, fetchRates, updateRate, loading } = useRateCardStore();
  const [activeItems, setActiveItems] = useState<string[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savingObj, setSavingObj] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRates();
    const fetchItems = async () => {
      const { data } = await supabase.from("item_names").select("name").eq("is_active", true).order("name");
      if (data) setActiveItems(data.map(d => d.name));
    };
    fetchItems();
  }, []);

  const getPriceKey = (itemName: string, grade: string) => `${itemName}___${grade}`;

  const getSavedRate = (itemName: string, grade: string) => 
    rates.find(r => r.item_name === itemName && r.grade === grade);

  const handlePriceChange = (itemName: string, grade: string, val: string) => {
    setEditingPrices(prev => ({ ...prev, [getPriceKey(itemName, grade)]: val }));
  };

  const handleSave = async (itemName: string, grade: string) => {
    const key = getPriceKey(itemName, grade);
    const val = editingPrices[key];
    if (!val || Number(val) < 0) {
      toast.error("Enter a valid positive price");
      return;
    }

    setSavingObj(prev => ({ ...prev, [key]: true }));
    const result = await updateRate(itemName, grade, Number(val));
    setSavingObj(prev => ({ ...prev, [key]: false }));

    if (result.success) {
      toast.success(`Rate updated for ${itemName} (${grade})`);
      setEditingPrices(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      toast.error(`Database Error: ${result.error}`);
    }
  };

  if (loading && rates.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /><span>Loading rates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Market Rate Card</h1>
        <p className="text-sm text-muted-foreground">Manage the baseline prices visible to your customers.</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              {GRADES.map(g => (
                <TableHead key={g} className="text-center">Grade {g}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeItems.map(item => (
              <TableRow key={item}>
                <TableCell className="font-semibold">{item}</TableCell>
                {GRADES.map(grade => {
                  const key = getPriceKey(item, grade);
                  const saved = getSavedRate(item, grade);
                  const isEditing = editingPrices[key] !== undefined;
                  const isSaving = savingObj[key];

                  return (
                    <TableCell key={grade} className="text-center p-2">
                       <div className="flex flex-col gap-2 items-center">
                          <div className="flex gap-1 items-center">
                            <span className="text-xs text-muted-foreground">PKR</span>
                            <Input 
                              type="number" min="0" 
                              className="h-8 w-20 text-center text-sm"
                              placeholder={saved ? String(saved.price_per_kg) : "0"}
                              value={editingPrices[key] ?? (saved ? String(saved.price_per_kg) : "")}
                              onChange={(e) => handlePriceChange(item, grade, e.target.value)}
                            />
                          </div>
                          {isEditing && (
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="h-6 text-[10px] w-full max-w-[100px]" 
                              onClick={() => handleSave(item, grade)}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </Button>
                          )}
                          {!isEditing && saved && (
                            <div className="text-[10px] text-muted-foreground">
                              Updated: {formatDate(saved.updated_at)}
                            </div>
                          )}
                       </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground mb-1">How this works:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>These prices are displayed as <strong>Indicative Rates</strong> to your customers in their portal.</li>
          <li>Customers use these rates to estimate their budget before placing an order.</li>
          <li>You are <strong>not locked</strong> into these prices. Final prices are negotiated and confirmed when you officially mark an order as Delivered/Sold.</li>
        </ul>
      </div>
    </div>
  );
};

export default RateCard;
