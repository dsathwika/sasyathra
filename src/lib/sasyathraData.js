import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

export function useDemands() {
  const [demands, setDemands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: demandRows, error: demandErr } = await supabase
      .from("demands")
      .select("*, contributions(*), processing_units(name)")
      .order("created_at", { ascending: false });

    const { data: unitRows } = await supabase.from("processing_units").select("*");

    if (demandErr) console.error(demandErr);
    setDemands(demandRows || []);
    setUnits(unitRows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("demands-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contributions" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  return { demands, units, loading, refetch: load };
}

export async function addDemand({ product, qty, location, buyer, date, price }) {
  const { error } = await supabase.from("demands").insert({
    product,
    qty_kg: qty,
    location,
    buyer_name: buyer,
    required_date: date || null,
    price_per_kg: price,
  });
  if (error) throw error;
}

export async function pledgeProduce({ demandId, farmerName, village, qty }) {
  const { data, error } = await supabase.rpc("pledge_produce", {
    p_demand_id: demandId,
    p_farmer_name: farmerName,
    p_village: village,
    p_qty: qty,
  });
  if (error) throw error;
  return data; // quantity actually accepted
}

export async function scheduleProcessing({ demandId, unitId }) {
  const batchId = "SYT-" + Math.floor(Math.random() * 90000 + 10000);
  const { error } = await supabase
    .from("demands")
    .update({ status: "processing", unit_id: unitId, batch_id: batchId })
    .eq("id", demandId);
  if (error) throw error;
}

export async function markDelivered(demandId) {
  const { error } = await supabase.from("demands").update({ status: "delivered" }).eq("id", demandId);
  if (error) throw error;
}

// The core answer to "why would a farmer wait instead of selling to the
// local mill today": as soon as a pledge is accepted, `advance_percent` of
// its value is available immediately. The rest settles on delivery. This
// function is the single source of truth for that math — every screen that
// shows earnings should call this rather than recomputing it inline.
export function computeEarnings(contribution, demand) {
  const gross = contribution.qty_kg * demand.price_per_kg;
  const advance = gross * (demand.advance_percent / 100);
  const balance = gross - advance;
  const balanceReleased = demand.status === "delivered";
  return {
    gross,
    advance,
    balance,
    balanceReleased,
    availableNow: advance + (balanceReleased ? balance : 0),
    pending: balanceReleased ? 0 : balance,
  };
}
