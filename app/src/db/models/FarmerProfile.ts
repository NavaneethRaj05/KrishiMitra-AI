import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class FarmerProfile extends Model {
  static table = 'farmer_profiles'

  @field('farmer_id') farmerId: any
  @field('name') name: any
  @field('phone') phone: any
  @field('state') state: any
  @field('district') district: any
  @field('block') block: any
  @field('primary_crops') primaryCrops: any // stringified JSON array
  @field('land_acres') landAcres: any
  @field('soil_type') soilType: any
  @field('irrigation_type') irrigationType: any
  @field('preferred_language') preferredLanguage: any
  @readonly @date('updated_at') updatedAt: any
}
