import { connectToDatabase } from './mongodb';
import {
  UserModel,
  CategoryModel,
  SubCategoryModel,
  ArticleModel,
  AffiliateLinkModel,
  ArticleAffiliateRelationModel,
  ClickLogModel,
  SubscriberModel,
  SettingModel,
} from './models';

export async function connectDb() {
  return connectToDatabase();
}

export * from './models';
export { connectToDatabase } from './mongodb';

export const User = UserModel;
export const Category = CategoryModel;
export const SubCategory = SubCategoryModel;
export const Article = ArticleModel;
export const AffiliateLink = AffiliateLinkModel;
export const ArticleAffiliateRelation = ArticleAffiliateRelationModel;
export const ClickLog = ClickLogModel;
export const Subscriber = SubscriberModel;
export const Setting = SettingModel;
