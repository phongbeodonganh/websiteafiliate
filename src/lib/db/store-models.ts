import mongoose, { Schema, type Model } from "mongoose";
import type { StoreRecord } from "@/lib/stores/types";

type StoredStore = Omit<StoreRecord, "id" | "updatedAt"> & { updatedAt: Date; createdAt: Date };

const StoreSchema = new Schema<StoredStore>({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  categorySlug: { type: String, default: "" },
  destination: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  imageAlt: { type: String, default: "" },
  content: { type: String, default: "" },
  faqs: [{ _id: false, question: String, answer: String }],
  offers: [{
    _id: false,
    id: { type: String, required: true },
    kind: { type: String, enum: ["code", "coupon"], required: true },
    title: { type: String, required: true },
    description: String, saving: String, code: String, destination: String, terms: String,
    startsAt: String, expiresAt: String, checkedAt: String,
    active: { type: Boolean, default: true },
  }],
  status: { type: String, enum: ["draft", "published", "archived", "deleted"], default: "draft" },
  showOnHomepage: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

StoreSchema.index({ status: 1, showOnHomepage: 1, sortOrder: 1 });
export const StoreModel: Model<StoredStore> = mongoose.models.Store || mongoose.model<StoredStore>("Store", StoreSchema);

// Separate counters also work for built-in stores without creating CMS replacements.
interface StoreMetrics { slug: string; viewCount: number; clickCount: number }
const StoreMetricsSchema = new Schema<StoreMetrics>({
  slug: { type: String, required: true, unique: true },
  viewCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
});
export const StoreMetricsModel: Model<StoreMetrics> = mongoose.models.StoreMetrics || mongoose.model<StoreMetrics>("StoreMetrics", StoreMetricsSchema);
