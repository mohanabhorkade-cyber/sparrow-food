// home.component.ts
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';
import { SeoService } from '../../services/seo.service';

interface ProductCategory {
  title: string;
  description: string;
  image: string;
  queryGroup: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgFor],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  productCategories: ProductCategory[] = [
    { title: 'Seasonings', description: 'Fiery, Smoky & Savory Classics', image: 'assets/images/optimized/main_seasoning.webp', queryGroup: 'Seasoning' },
    { title: 'Flavours (Liquid & Spray Dried Powder)', description: 'Premium Flavours & Natural Extracts', image: 'assets/images/optimized/Main_Flavours_Extracts1.png', queryGroup: 'Flavours (Liquid & Spray Dried Powder)' },
    { title: 'Dried Fruit & Vegetable Flakes', description: 'Natural Dried Ingredients', image: 'assets/images/optimized/DriedFruit_Vegetable_Flakes.webp', queryGroup: 'Dried Fruit & Vegetable Flakes' },
    { title: 'Fruit & Vegetable Powders', description: 'Pure & Natural Powdered Ingredients', image: 'assets/images/optimized/fruit_vegatable_powder.webp', queryGroup: 'Fruit & Vegetable Powders' },
    { title: 'Tea,Coffee & Milk Premixes', description: 'Instant Premixes for Every Sip', image: 'assets/images/optimized/Tea_coffee_milk_premix.webp', queryGroup: 'Tea,Coffee & Milk Premixes' },
    { title: 'Instant Drink Beverage Premixes', description: 'Refreshing Instant Beverage Mixes', image: 'assets/images/Instant_Drink_Beverage_Premixes.png', queryGroup: 'Instant Drink Beverage Premixes' },
    { title: 'Mixes for Cocktail Beverages', description: 'Exotic & Tangy Cocktail Range', image: 'assets/images/mixes_cocktail.png', queryGroup: 'Mixes for Cocktail Beverages' },
    { title: 'Powdered Salts', description: 'Natural Mineral Salt Selection', image: 'assets/images/optimized/powdered_salt.webp', queryGroup: 'Powdered Salts' },
    { title: 'Bakery Ingredients/Additives', description: 'Essential Additives for Perfect Baking', image: 'assets/images/optimized/Beakary_ingreadient.webp', queryGroup: 'Bakery Ingredients/Additives' },
    { title: 'Seasoning Ingredients/Additives', description: 'Taste Enhancers & Functional Additives', image: 'assets/images/optimized/seasoning_ingradients.webp', queryGroup: 'Seasoning Ingredients/Additives' },
    { title: 'Dairy Product Ingredients/Additives', description: 'Texture, Taste & Stability Solutions', image: 'assets/images/optimized/dairy_product.webp', queryGroup: 'Dairy Product Ingredients/Additives' },
    { title: 'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)', description: 'Premium Ingredients for Carbonated Drinks', image: 'assets/images/brevarage_ingradienceA.png', queryGroup: 'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)' },
    { title: 'Beverage Ingredients/Additives - B.Fruit Based Beverage', description: 'Natural Additives for Fruit Beverages', image: 'assets/images/optimized/brevarage_ingradience.webp', queryGroup: 'Beverage Ingredients/Additives - B.Fruit Based Beverage' },
    { title: 'Confectionery Ingredients/Additives', description: 'Texture, Colour & Flavour Solutions', image: 'assets/images/optimized/Confectionery_Ingredients.webp', queryGroup: 'Confectionery Ingredients/Additives' },
    { title: 'Food Colours', description: 'Texture, Colour & Flavour Solutions', image: 'assets/images/food_colors.png', queryGroup: 'Food Colours' }
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    // Set specific SEO for home page
    this.seoService.updateSeo({
      title: 'Sparrow Food - Premium Food Ingredients & Seasonings Supplier',
      description: 'Leading supplier of premium food ingredients, seasonings, and flavorings for food manufacturers. Quality products including spices, extracts, powders, and beverage ingredients.',
      keywords: 'food ingredients, seasonings, flavorings, spices, food manufacturing, culinary supplies, beverage ingredients, bakery additives, dairy ingredients',
      image: 'https://sparrowfood.com/assets/images/og-home.jpg',
      url: 'https://sparrowfood.com',
      type: 'website',
      canonicalUrl: 'https://sparrowfood.com',
      breadcrumb: [{ name: 'Home', url: 'https://sparrowfood.com' }],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Sparrow Food',
        description: 'Premium food ingredients and seasonings supplier',
        url: 'https://sparrowfood.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://sparrowfood.com/products?search={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }
    });
  }

  trackByCategory(index: number, category: ProductCategory): string {
    return category.queryGroup || index.toString();
  }
}
