import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EmailService } from '../../services/email.service';
import { DataService } from '../../services/data.service';
import { SeoService } from '../../services/seo.service';
import { ImagePreloadService } from '../../services/image-preload.service';

interface Product {
  name: string;
  category: string;
  subItem: string;
  brand: string;
  packSize: string;
  shelfLife: string;
  moq: string;
  freight: string;
  image: string;
  fallback?: boolean;
}

interface Category {
  key: string;
  label: string;
  description: string;
  styleClass: string;
  subItems: string[];
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, NgOptimizedImage],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnInit, OnDestroy {

  showMenu = true;
  selectedCategory = '';
  selectedSubItem = '';
  selectedGroup: string | null = null;
  selectedGroupSubItem = '';
  showSubItemList = false;
  selectedProduct: Product | null = null;
  private destroy$ = new Subject<void>();

  showInquiryModal = false;
  inquiryProduct: Product | null = null;
  inquiryForm = {
    name: '',
    email: '',
    message: ''
  };
  inquiryStatus = '';
  inquiryStatusType: 'error' | 'success' | '' = '';
  isInquirySubmitting = false;

  productGroups: string[] = [
    'Seasoning',
    'Dried Fruit & Vegetable Flakes',
    'Fruit & Vegetable Powders',
    'Tea,Coffee & Milk Premixes',
    'Instant Drink Beverage Premixes',
    'Mixes for Cocktail Beverages',
    'Powdered Salts',
    'Flavours (Liquid & Spray Dried Powder)',
    'Bakery Ingredients/Additives',
    'Confectionery Ingredients/Additives',
    'Dairy Product Ingredients/Additives',
    'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)',
    'Beverage Ingredients/Additives - B.Fruit Based Beverage',
    'Seasoning Ingredients/Additives',
    'Food Colours'
  ];

  groupDefinitions: Record<string, { description: string; image?: string; subItems: Array<{ label: string; description?: string; image?: string; items: string[] }> }> = {
    Seasoning: {
      description: 'Seasoning solutions with dedicated subcategories and product lines.',
      image: 'assets/images/optimized/seasonings_hero.webp',
      subItems: [
        {
          label: 'Extruded Snacks',
          description: 'Seasonings for extruded snack products.',
          // image: 'assets/images/optimized/extruded_snack.webp',
          image: 'assets/images/optimized/extruded_snack1.webp',
          items: [
            'Biryani Masala Seasoning',
            'Cheesy Onion Seasoning',
            'Green Chutney Seasoning',
            'Juicy Tomato Seasoning',
            'Spanish Tomato Seasoning',
            'Tangy Tomato Seasoning',
            'Tomato Ketchup Seasoning',
            'Tomato Salsa Seasoning',
            'Chinese Tadka Seasoning',
            'Schezwan Seasoning',
            'Manchurian Seasoning',
            'Smoky Cheese Chilly Seasoning',
            'Masala Munch Seasoning',
            'Noodle Masala Seasoning',
            'Cheese n Onion Seasoning',
            'Achari Masti Seasoning',
            'Cheese Seasoning',
            'Korean Masala Seasoning',
            'Panipuri Seasoning',
            'Pudina Seasoning',
            'Strawberry Seasoning',
            'Vanilla Seasoning',
            'Banana Seasoning',
            'Chatpata Seasoning'

          ]
        },
        {
          label: 'Indian Namkeen',
          description: ' Tasty Seasoning blends for namkeen varieties.',
          // image: 'assets/images/optimized/indian_numkin.webp',
          image: 'assets/images/optimized/indian_numkin.webp',
          items: [
            'Aloo Bhujia Seasoning',
            'Bhelpuri Masala Seasoning',
            'Bikaneri Bhujia Seasoning',
            'Chaati Masala Seasoning',
            'Chana Jor Garam Masala Seasoning',
            'Chanachur Seasoning',
            'Chilli Lemon Seasoning',
            'Dabeli Seasoning',
            'Farsan Masala Seasoning',
            'Flaming Hot Seasoning',
            'Garam Masala Seasoning',
            'Garlic Sev Seasoning',
            'Green Chilli Garlic Seasoning',
            'Hing Jeera Seasoning',
            'Hyderabadi Biryani Seasoning',
            'Kachori Seasoning',
            'Khatta Meetha Seasoning',
            'Makhmali Chivda Seasoning',
            'Nadiyadi Mix ',
            'Navratan Mix',
            'Panipuri Masala Seasoning',
            'Peri Peri Bhujia Seasoning',
            'Punjabi Tadka Seasoning',
            'Salt & Pepper Seasoning',
            'Sambar Seasoning',
            'Schezwan Bhujia Seasoning',
            'Shing Bhujiya Masala Seasoning',
            'Lemon Chilly Shing Bhujiya',
            'Chana Dal Masala Seasoning',
            'Moong Dal Masala Seasoning',
            'Zalmuri Masala Seasoning',
            'Bombay Bhel Seasoning',
            'Chinese Bhel Seasoning',
            'Chitoor Bhel Seasoning',
            'Chowpati Bhel Seasoning',
            'Indori Bhel Seasoning',
            'Karnataki Bhel Seasoning',
            'Kolhapuri Bhadang Seasoning',
            'Kolkata Style Bhel Seasoning',
            'Delhi Chat Seasoning',
            'Rajasthani Bhel Seasoning'
          ]
        },
        {
          label: 'Potato Chips',
          description: 'Seasonings for potato chips.',
          image: 'assets/images/optimized/potato_chips.webp',
          items: [
            '2x Spicy Sizzling Hot Seasoning ',
            'Korean Hot n Spicy Seasoning',
            'Thai Sweet Chilly Seasoning',
            'Chilli Tadka Seasoning',
            'Sour Cream n Onion Seasoning',
            'Flaming Hot Seasoning',
            'Jalapeño Seasoning',
            'Juicy Tomato Seasoning',
            'Lemon Chilli Seasoning',
            'Magic Masala Seasoning',
            'Panipuri Seasoning',
            'Paprika Seasoning',
            'Pizza Seasoning',
            'Spanish Tomato Seasoning ',
            'Spicy Tomato Seasoning',
            'Spicy Treat Seasoning',
            'Szechuan Chilli Pepper Seasoning ',
            'Tangy Tomato Seasoning',
            'Tomato Salsa Seasoning',
            'Chilly Tadka Seasoning'

          ]
        },
        {
          label: 'Noodles & Pasta',
          description: 'MouthWatering seasoning blends for noodles and pasta.',
          image: 'assets/images/optimized/noodles_pasta.webp',
          items: [
            'Hakka Noodle Masala',
            'Noodle Masala Seasoning',
            'Mirch Noodle Masala',
            'Chinese Seasoning',
            'Korean Hot & Spicy Seasoning',
            'Schezwan Noodle Masala',
            'Manchurian Seasoning',
            'Magic Masala',
            'Jafrani Biryani Noodle Masala',
            'Peri Peri Pasta Seasoning',
            'Cheese Pasta Seasoning',
            'Tomato Pasta Seasoning',
            'Italian Herb Pasta Seasoning'
          ]
        },
        {
          label: 'Jain Seasonings',
          description: 'Seasoning blends for Jain dietary preferences.',
          image: 'assets/images/optimized/jain_seasoning.webp',
          items: [
            'Jain Noodle Masala',
            'Jain Pav Bhaji Masala',
            'Jain Tomato Seasoning',
            'Jain Peri Peri Seasoning',
            'Jain Pudina Masala Seasoning',
            'Jain Hing Jeera Masala',
            'Jain Schezwan Masala',
            'Jain Biryani Seasoning',
            'Jain Korean BBQ Seasoning',
            'Jain Magic Masala Seasoning',
            'All types of Jain Seasonings',
          ]
        },
        {
          label: 'QSR & Marinades',
          description: 'Seasoning solutions for QSR & Marinades.',
          image: 'assets/images/optimized/QSR_marinade.webp',
          items: [
            'Tandoori Marinade',
            'Peri Peri Marinade',
            'BBQ Marinade',
            'Hot & Spicy Marinade',
            'Chettinad Marinade',
            'Afghani Marinade',
            'Garlic & Herb Marinade',
            'Butter Garlic Marinade',
            'Ghee Marinade'
          ]
        },
        {
          label: 'Powder Sprinkler',
          description: 'Powder Sprinkler seasoning Offerings.',
          image: 'assets/images/optimized/Powder_Sprinkler.webp',
          items: [
            'Cajun Sprinkler Seasoning',
            'Chaat Sprinkler Seasoning',
            'Cheese & Herb Sprinkler Seasoning',
            'Chilli Sprinkler Seasoning',
            'Manchurian Sprinkler Seasoning',
            'Mixed Herbs Sprinkler Seasoning',
            'Nagin Sprinkler Seasoning',
            'Noodle Sprinkler Seasoning',
            'Oregano Sprinkler Seasoning',
            'Lime n Pepper Sprinkler Seasoning',
            'Peri Peri Sprinkler Seasoning',
            'Pizza Sprinkler Seasoning',
            'Schezwan Sprinkler Seasoning',
            'Truffle Sprinkler Seasoning',
            'Korean Kimchi Sprinkler Seasoning'


          ]
        },
        {
          label: 'Biryani Seasonings',
          description: 'Seasoning blends for biryani applications.',
          image: 'assets/images/optimized/biryani_seasoning.webp',
          items: [
            'Special Hyderabadi Biryani',
            'Jafrani Biryani Masala',
            'Chilly Tadka Biryani Masala',
            'Lakhnavi Biryani Masala',
            'South Indian Spicy Biryani',
            'Bombay Biryani',
            'Ghee Biryani'
          ]
        },
        {
          label: 'Mayonnaise, Dips Bases & Sauces',
          description: 'Seasoning blends for mayonnaise, dips ands souces.',
          image: 'assets/images/optimized/mayonnaise_dips_base.webp',
          items: [
            'BBQ Seasoning',
            'Demi-Glace Seasoning',
            'Deviled Curry Seasoning',
            'Dynamite Seasoning',
            'Flaming Hot Seasoning',
            'Green Chilli Seasoning',
            'Honey Mustard Seasoning',
            'Lime Peri Peri Seasoning',
            'Manchurian Seasoning',
            'Nagin Seasoning',
            'Pudina Seasoning',
            'Sweet Onion Seasoning',
            'Tandoori Seasoning',
            'Tomato Ketchup Seasoning',
            'Mint Mayonnaise',
            'Chipotle Southwest Seasoning',
            'Tandoori Mayo Seasoning',
            'Honey Mustard Seasoning',
            'Mustard Sauce Seasoning',
            'Sweet Onion Sauce Seasoning',
            'Red Chilli Sauce Seasoning',
            'Green Chilli Sauce Seasoning',
            'Peri Peri Sauce Seasoning',
            'Schezwan Sauce Seasoning',
            'Hot Sauce Seasoning',
            'Ranch Dressing Seasoning',
            'Thousand Island Seasoning',
            'Garlic Mayo Seasoning',
            'Black Pepper Seasoning'

          ]
        },
        {
          label: 'Soup Seasonings',
          description: 'Authentic Seasoning Blends for Flavorful Soups.',
          image: 'assets/images/optimized/soup_seasoning.webp',
          items: [
            'Tomato Soup Powder (Clear)',
            'Tomato Soup (Thick Premium)',
            'Manchow Soup',
            'Mix Veg Soup',
            'Veg Broth Seasoning',
            'Hot & Sour Soup Mix',
            'Sweet Corn Soup Mix',
            'Creamy Mushroom Soup'
          ]
        },
        {
          label: 'Indian Gravies & Mixes',
          description: 'Crafted Seasoning Blends for Classic Indian Gravies.',
          image: 'assets/images/optimized/ind_gravies&mixes.webp',
          items: [
            'Paneer Butter Masala Mix',
            'Shahi Paneer Masala Mix',
            'Kadai Paneer Masala Mix',
            'Paneer Tikka Masala Mix',
            'Mix Veg Gravy Mix',
            'Veg Kofta Gravy Mix',
            'Aloo Dum Gravy Mix',
            'Veg Lababdar Gravy Mix',
            'Punjabi Gravy Masala Mix',
            'Tomato Makhani Gravy Mix',
            'White Gravy Mix (Cashew Base)',
            'Yellow Gravy Mix',
            'Brown Onion Gravy Mix',
            'Malai Kofta Masala Mix',
            'Navratan Korma Masala Mix',
            'Veg Kolhapuri Masala Mix',
            'Veg Curry Masala Mix',
            'All Purpose Veg Gravy Premix',
            'Sabji Gravy Masala Mix',
            'Restaurant Style Base Gravy Mix',
            'Jain (No Onion No Garlic) Gravy Mix'

          ]
        },
        {
          label: 'Clean Label Seasonings',
          description: 'Pure Seasonings Crafted with Clean Ingredients. Free from Artificial Additives, Preservatives, and Flavors. No INS or E-Numbers.',
          image: 'assets/images/optimized/snacks.webp',
          items: [
            'Pudina Seasoning – CP3631 CL',
            'Jalapeno Seasoning – CP3901 CL',
            'Chatpata Seasoning – AB2575 CL',
            'Masala Seasoning – AB2576 CL',
            'Salt & Pepper Seasoning – CP3792 CL',
            'Peri Peri Seasoning – CP3638 CL',
            'Jalapeno Seasoning – AB2332 CL',
            'Cheese Garlic Seasoning – CP3648 CL',
            'Paprika Seasoning – AB2333 CL',
            'Thai Chilli Seasoning – AB2334 CL',
            'Mexican Salsa Seasoning – AB2335 CL',
            'Chilli Garlic Seasoning – AB2336 CL',
            'Truffle and Sea Salt Seasoning – AB2281 CL',
            'Herbs and Parmesan Cheese – AB2282 CL',
            'Black Pepper and Sea Salt – AB2283 CL',
            'Masala Masti Seasoning – AB1674 CL',
            'Punjabi Tadka Seasoning – AB1675 CL',
            'Magic Masala Seasoning – AB1676 CL',
            'Chatpata Masala Seasoning – AB1677 CL',
            'Masala Mania Seasoning – AB1678 CL',
            'TIKHA Spicy Masala Seasoning – AB1679 CL'

          ]
        },
        {
          label: 'Batters & Coatings',
          description: 'Seasoning Solutions for batters and coatings.',
          image: 'assets/images/optimized/batters&coating.webp',
          items: [
            'Tempura Batter Mix',
            'Pre Dust',
            'Spicy Breader'
          ]
        },
        {
          label: 'Chutneys',
          description: 'Seasoning Blends for Flavorful Chutneys.',
          image: 'assets/images/optimized/chutneys.webp',
          items: [
            'Green Chilli Chutney',
            'Tamarind Chutney',
            'Red Chilli Garlic Chutney',
            'Panipuri Chutney',
            'Schezwan Chutney',
            'Maharashtrian Thecha Seasoning'
          ]
        },
      ]
    },
    'Dried Fruit & Vegetable Flakes': {
      description: 'Dried fruit and vegetable flakes for bakery, snacks, and beverage applications.',
      image: 'assets/images/optimized/dried_flakes.webp',
      subItems: [
        {
          label: 'Flakes',
          description: 'Natural Dried/Dehydrated Ingredients in Flake Form',
          image: 'assets/images/optimized/dried_flakes.webp',
          items: [
            'Chilli Flakes',
            'Oregano Flakes',
            'Ginger Flakes',
            'Onion Flakes',
            'Carrot Flakes',
            'Spinach Flakes',
            'Moringa leaves',
            'Coriander leave',
            'Potato Flakes',
            'Beetroot Flakes'
          ]
        }
      ]
    },
    'Fruit & Vegetable Powders': {
      description: 'Fruit and vegetable powders for flavoring and color enhancement.',
      image: 'assets/images/optimized/fruit_powders.webp',
      subItems: [
        {
          label: 'Powders',
          description: 'Pure & Natural Ingredient Powders for Flavor and Color',
          image: 'assets/images/optimized/driedFruits&vegetsble.webp',
          items: [
            'Moringa Leaves Powder',
            'Spinach Powder',
            'Onion Powder',
            'Garlic Powder',
            'Beetroot Powder',
            'Hing Powder',
            'Green Chilli Powder',
            'Ginger Powder',
            'Cheese Powder',
            'Tomato Powder'
          ]
        }
      ]
    },
    'Tea,Coffee & Milk Premixes': {
      description: 'Tea, coffee and milk premixes for instant beverage production.',
      image: 'assets/images/optimized/tea_coffee&milk_primixes.webp',
      subItems: [
        {
          label: 'Tea Premixes',
          description: 'Natural & Aromatic Tea Mixes for Instant Brewing',
          image: 'assets/images/optimized/tea_premix.webp',
          items: [
            'Cardamom Tea',
            'Ginger Tea',
            'Masala Tea',
            'Lemongrass Tea',
            'Plain Tea'
          ]
        },
        {
          label: 'Coffee Premixes',
          description: 'Premium Flavoured Coffee Blends',
          image: 'assets/images/optimized/Tea_coffee_milk_premix1.webp',
          items: [
            'Coffee Premix',
            'Mocha Coffee Premix',
            'Vanilla Coffee Premix'
          ]
        },
        {
          label: 'Ice Tea Premixes',
          description: 'Natural & Fruity Ice Tea Mixes for Refreshing Beverages',
          image: 'assets/images/optimized/iceteaprimixes.webp',
          items: [
            'Lemon Ice Tea',
            'Peach Ice Tea',
            'Green Apple Ice Tea'
          ]
        },
        {
          label: 'Milkshakes & Beverages',
          description: 'Natural & Creamy Beverage Mixes for Delicious Milkshakes',
          image: 'assets/images/optimized/milkshake.webp',
          items: [
            'Strawberry Milkshake',
            'Mango Milkshake',
            'Irish Cream Shake'
          ]
        },
        {
          label: 'Smoothie Mixes',
          description: 'Natural & Creamy Smoothie Range for Delicious Blends',
          image: 'assets/images/optimized/smoothie.webp',
          items: [
            'Cold Coffee Premix',
            'Vanilla Smoothie Mix',
            'Thick Chocolate Smoothie Mix',
            'Non-Dairy Smoothie Mix'
          ]
        }
      ]
    },
    'Instant Drink Beverage Premixes': {
      description: 'Instant drink premixes for beverages.',
      image: 'assets/images/optimized/instant_drinks.webp',
      subItems: [
        {
          label: 'Instant Drink Beverage Premixes',
          description: 'Natural & Traditional Beverage Premixes for Instant Refreshment',
          image: 'assets/images/optimized/instant_drinks.webp',
          items: [
            'Hot Chocolate Premix',
            'Drinking Chocolate Mix',
            'Cocoa Beverage Mix',
            'Malted Milk Drink Mix',
            'Badam Milk Premix',
            'Kesar Milk Premix',
            'Turmeric Latte Premix',
            'Protein Drink Premix',
            'Health Drink Powder Mix',
            'Chocolate Milkshake Premix',
            'Strawberry Milkshake Premix',
            'Vanilla Milkshake Premix',
            'Mango Milkshake Premix',
            'Banana Milkshake Premix',
            'Butterscotch Milkshake Premix',
            'Mango Lassi Premix',
            'Buttermilk Premix',
            'Masala Chaas Premix',
            'Jaljeera Drink Mix',
            'Kokum Drink Mix',
            'Aam Panna Premix',
            'Shikanji Premix',
            'Lemonade Powder Mix',
            'Orange Drink Powder Mix',
            'Mixed Fruit Drink Powder Mix',
            'Electrolyte Drink Powder',
            'Glucose Drink Powder',
            'Energy Drink Powder Mix'


          ]
        }
      ]
    },
    'Mixes for Cocktail Beverages': {
      description: 'Cocktail mixes for mixers and ready-to-drink beverages.',
      image: 'assets/images/optimized/cocktail_mixes.webp',
      subItems: [
        {
          label: 'Cocktail Beverages',
          description: 'Exotic & Tangy Cocktail Range for Mixers and Ready-to-Drink Beverages',
          image: 'assets/images/optimized/mixescocktail.webp',
          items: [
            'Margarita Mix Powder',
            'Lime Margarita Premix',
            'Strawberry Margarita Premix',
            'Pina Colada Mix Powder',
            'Mojito Mint Mix Powder',
            'Classic Mojito Premix',
            'Blue Lagoon Mix Powder',
            'Cosmopolitan Mix Powder',
            'Sex on the Beach Mix Powder',
            'Long Island Iced Tea Mix Powder',
            'Whiskey Sour Mix Powder',
            'Sour Mix Powder',
            'Sweet & Sour Mix Powder',
            'Bloody Mary Mix Powder',
            'Virgin Mary Mix Powder',
            'Daiquiri Mix Powder',
            'Strawberry Daiquiri Premix',
            'Peach Bellini Mix Powder',
            'Sangria Mix Powder',
            'Fruit Punch Cocktail Mix Powder',
            'Cranberry Cocktail Mix Powder',
            'Orange Cocktail Mix Powder',
            'Pineapple Cocktail Mix Powder',
            'Green Apple Cocktail Mix Powder',
            'Watermelon Cocktail Mix Powder',
            'Passion Fruit Cocktail Mix Powder',
            'Lychee Cocktail Mix Powder',
            'Ginger Cocktail Mix Powder',
            'Mint Cocktail Mix Powder',
            'Cola Cocktail Base Powder'

          ]
        }
      ]
    },
    'Powdered Salts': {
      description: 'Powdered salt blends for food seasoning and processing.',
      image: 'assets/images/optimized/powdered_salts.webp',
      subItems: [
        {
          label: 'Powdered salts',
          description: 'Natural Mineral Salt Collection',
          image: 'assets/images/optimized/powderedsalt.webp',
          items: [
            'Rock Salt (Sendha Namak)',
            'Himalayan Pink Salt',
            'Sea Salt (unrefined)',
            'Black Salt (Kala Namak)'
          ]
        }
      ]
    },
    'Flavours (Liquid & Spray Dried Powder)': {
      description: 'Flavours & Flavour Compounds for Food, Beverage, Bakery, Confectionery, Seasoning and Dairy Applications.',
      image: 'assets/images/optimized/flavours_extracts.webp',
      subItems: [
        {
          label: 'Flavours (Liquid & Spray Dried Powder)',
          description: 'Liquid & Spray‑Dried Flavours: Natural, Nature‑Identical & Artificial Flavour Systems for Food, Beverage, Bakery, Confectionery, Seasoning and Dairy Applications. Both in water soluble & oil soluble forms.',
          image: 'assets/images/optimized/flavorandextract.webp',
          items: [
            'Garlic Flavour',
            'Smoke Flavour',
            'Coffee Flavour',
            'Vanilla Flavour Powder',
            'Saffron Flavour',
            'Rum',
            'Lahori Jeera',
            'Brandy',
            'Whiskey',
            'Vodka',
            'Tequila',
            'Gin',
            'Beer',
            'Chocolate',
            'Butter',
            'Butterscotch',
            'Ghee',
            ' Apple Flavour',
            'Blueberry Flavour',
            'Bubble Gum Flavour',
            'Energy Drink Flavour',
            'Fig Flavour',
            'Ginger Flavour',
            'Guava Flavour',
            'Jamun Flavour',
            'Jeera Masala Flavour',
            'Kiwi Flavour',
            'Lemon Flavour',
            'Lime Flavour',
            'Lychee Flavour',
            'Mango Flavour',
            'Mango Alphonso Flavour',
            'Mint Flavour',
            'Mojito Flavour',
            'Muskmelon Flavour',
            'Nimbu Pani Flavour',
            'Orange Flavour',
            'Pineapple Flavour',
            'Pomegranate Flavour',
            'Rooh Afza Flavour',
            'Strawberry Flavour',
            'Tamarind Flavour',
            'Tutti Frutti Flavour',
            'Watermelon Flavour',
            'Apple Spray Dried (SD) Powder Flavour',
            'Banana Spray Dried (SD) Powder Flavour',
            'Butter Spray Dried (SD) Powder Flavour',
            'Cardamom Spray Dried (SD) Powder Flavour',
            'Cheese Spray Dried (SD) Powder Flavour',
            'Chocolate Spray Dried (SD) Powder Flavour',
            'Cumin Spray Dried (SD) Powder Flavour',
            'Garlic Spray Dried (SD) Powder Flavour',
            'Ginger Spray Dried (SD) Powder Flavour',
            'Green Chilli Spray Dried (SD) Powder Flavour',
            'Guava Spray Dried (SD) Powder Flavour',
            'Lemon Spray Dried (SD) Powder Flavour',
            'Lychee Spray Dried (SD) Powder Flavour',
            'Mango Spray Dried (SD) Powder Flavour',
            'Milk Spray Dried (SD) Powder Flavour',
            'Mustard Spray Dried (SD) Powder Flavour',
            'Orange Spray Dried (SD) Powder Flavour',
            'Pan Spray Dried (SD) Powder Flavour',
            'Peri-Peri Spray Dried (SD) Powder Flavour',
            'Pineapple Spray Dried (SD) Powder Flavour',
            'Pudina Spray Dried (SD) Powder Flavour',
            'Rose Spray Dried (SD) Powder Flavour',
            'Saffron Spray Dried (SD) Powder Flavour',
            'Strawberry Spray Dried (SD) Powder Flavour',
            'Tomato Spray Dried (SD) Powder Flavour',
            'Vanilla Spray Dried (SD) Powder Flavour'
          ]
        }
      ]
    },
    'Bakery Ingredients/Additives': {
      description: 'Bakery ingredients and additives for improved product performance.',
      image: 'assets/images/optimized/bakery_ingredients.webp',
      subItems: [
        {
          label: 'Leavening Agents',
          description: 'Leavening agents for bakery applications',
          image: 'assets/images/optimized/Leavening_agent.webp',
          items: [
            'Baking powder',
            'Baking soda (sodium bicarbonate)',
            'Yeast',
            'Ammonium bicarbonate'
          ]
        },
        {
          label: 'Emulsifiers',
          description: 'Emulsifiers for bakery applications',
          image: 'assets/images/optimized/emulsifiers.webp',
          items: [
            'Lecithin',
            'Mono & diglycerides (E471)',
            'DATEM',
            'SSL (Sodium stearoyl lactylate)',
            'CSL (Calcium stearoyl lactylate)',
            'Polysorbates'
          ]
        },
        {
          label: 'Dough Improvers',
          description: 'Dough improvers for bakery applications',
          image: 'assets/images/optimized/dough_improvers.webp',
          items: [
            'Ascorbic acid (Vitamin C)',
            'Enzyme blends',
            'Calcium carbonate',
            'DATEM-based improvers'
          ]
        },
        {
          label: 'Enzymes',
          description: 'Enzymes for bakery applications',
          image: 'assets/images/optimized/enzymes.webp',
          items: [
            'Amylase',
            'Lipase',
            'Xylanase',
            'Protease'
          ]
        },
        {
          label: 'Preservatives',
          description: 'Preservatives for bakery applications',
          image: 'assets/images/optimized/preservatives.webp',
          items: [
            'Calcium propionate',
            'Sodium propionate',
            'Potassium sorbate'
          ]
        },
        {
          label: 'Stabilizers & Thickeners',
          description: 'Stabilizers and thickeners for bakery applications',
          image: 'assets/images/optimized/stabilizers_thickeners.webp',
          items: [
            'Xanthan gum',
            'Guar gum',
            'CMC (Carboxymethyl cellulose)',
            'Pectin'
          ]
        },
        {
          label: 'Bakery Flavours',
          description: 'Flavors for bakery applications',
          image: 'assets/images/optimized/bakery_flavours.webp',
          items: [
            'Garlic Bread',
            "Ajwain Flavour",
            "Blueberry Flavour",
            "Butter Flavour",
            "Cardamom Flavour",
            "Cheese Flavour",
            "Chocolate Flavour",
            "Coconut Flavour",
            "Coffee Flavour",
            "Condensed Milk Flavour",
            "Fruit & Nut Flavour",
            "Ghee Flavour",
            "Jeera Flavour",
            "Kesar Flavour",
            "Masala Chai Flavour",
            "Milk Flavour",
            "Orange Flavour",
            "Pineapple Flavour",
            "Strawberry Flavour",
            "Vanilla Flavour"

          ]
        },
        {
          label: 'Bakery Colours',
          description: 'Colours for bakery applications',
          image: 'assets/images/optimized/bakery_colours.webp',
          items: [
            'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Ponceau 4R (INS 124 / E124) – Bright red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red',
            'Indigo Carmine (INS 132 / E132) – Blue',
            'Brilliant Blue FCF (INS 133 / E133) – Bright blue',
            'Fast Green FCF (INS 143 / E143) – Green',
            'Brilliant Black BN (INS 151 / E151) – Black',
            'Brown HT (INS 155 / E155) – Chocolate brown'
          ]
        },
        {
          label: 'Cocoa Powder for Bakery',
          description: 'Cocoa powder for bakery applications',
          image: 'assets/images/optimized/Cocoa Powder for Bakery.webp',
          items: [
            'Regular Cocoa Powder',
            'Dark Cocoa Powder'
          ]
        }
      ]
    },
    'Confectionery Ingredients/Additives': {
      description: 'Confectionery ingredients and additives for candy and sweet products.',
      image: 'assets/images/optimized/confectionery_ingredients.webp',
      subItems: [
        {
          label: 'Sweeteners (Provide Sweetness & Bulk)',
          description: 'Sweeteners & Sugar Alternatives for Confectionery',
          image: 'assets/images/optimized/Sweeteners.webp',
          items: [
            'Fructose syrup / HFCS',
            'Sugar substitutes - sorbitol, maltitol, FOS'
          ]
        },
        {
          label: 'Humectants (Moisture Retention, Softness)',
          description: 'Humectants for Moisture Retention & Softness in Confectionery: Natural & Synthetic Options for Texture Enhancement and Shelf-Life Extension',
          image: 'assets/images/optimized/Humectants.webp',
          items: [
            'Glycerol (glycerin)',
            'Sorbitol',
            'Maltitol',
            'FOS Fructo-oligosaccharide'
          ]
        },
        {
          label: 'Gelling / Structuring Agents (Texture Formation) ',
          description: 'Gelling Agents for Texture Formation in Confectionery: Natural & Synthetic Options for Gelling, Thickening, and Stabilizing Candy and Sweet Products',
          image: 'assets/images/optimized/Gelling.webp',
          items: [
            'Pectin',
            'Carrageenan'
          ]
        },
        {
          label: 'Emulsifiers (Mixing Fat + Water)',
          description: 'Emulsifiers for Stability & Texture in Confectionery: Natural & Synthetic Options for Mixing Fat and Water, Texture Enhancement, and Shelf-Life Extension',
          image: 'assets/images/optimized/Emulsifiers_mix.webp',
          items: [
            'Lecithin',
            'Mono & diglycerides (E471)',
            'Polysorbates'
          ]
        },
        {
          label: 'Acidity Regulators (Taste Balance, pH Control)',
          description: 'Natural Acidity Regulators for Taste & pH Control in Confectionery',
          image: 'assets/images/optimized/Acidity_Regulators.webp',
          items: [
            'Malic acid ',
            'Tartaric acid ',
            'Lactic acid ',
            'Sodium citrate '
          ]
        },
        {
          label: 'Confectionery Flavours',
          description: 'Premium Flavours for Chocolates, Candies, Toffees, Chewing Gums, Jellies, Marshmallows, Caramels, Dairy‑based Sweets, Baked Confectionery, Pan Masala & Indian Sweets.',
          image: 'assets/images/optimized/Flavours_test_aroma.webp',
          items: [
            'Alphanso Mango',
            'Apple',
            'Orange',
            'Pineapple',
            'Bubblegum',
            'Milk Caramel',
            'Cardamom',
            'Milk Caramel',
            'Chocolate',
            'Coffee',
            'Green Mango',
            'Fudge',
            'Ginger Lemon',
            'Tamarind',
            'Guava',
            'Gulkand',
            'Lemon',
            'Lychee',
            'Mint',
            'Pan Masala',
            'Strawberry'
          ]
        },
        {
          label: 'Colours',
          description: 'Colours solutions for confectionery applications',
          image: 'assets/images/optimized/bakery_colours_applications.webp',
          items: [
            'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Ponceau 4R (INS 124 / E124) – Bright red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red',
            'Natural colours- beetroot, turmeric, spirulina '
          ]
        },
        {
          label: 'Preservatives (Shelf-Life Extension)',
          description: 'Preservatives for Extended Shelf-Life in Confectionery',
          image: 'assets/images/optimized/Preservatives (Shelf-Life Extension).webp',
          items: [
            'Potassium sorbate',
            'Sodium benzoate'
          ]
        },
        {
          label: 'Anti-Crystallization Agents (Texture Control)',
          description: 'Anti-Crystallization Agents for Texture Control in Confectionery: Natural & Synthetic Options for Preventing Sugar Crystallization and Maintaining Desired Texture in Candy and Sweet Products',
          image: 'assets/images/optimized/Anti_Crystallization_Agents.webp',
          items: [
            'Glucose syrup',
            'Invert sugar'
          ]
        },
        {
          label: 'Anti-Caking Agents (Flow Improvement)',
          description: 'Anti-Caking Agents for Flow Improvement in Confectionery',
          image: 'assets/images/optimized/Anti_Caking_Agents.webp',
          items: [
            'Silicon dioxide',
            'Calcium silicate'
          ]
        }
      ]
    },
    'Dairy Product Ingredients/Additives': {
      description: 'Dairy product ingredients and additives for different dairy applications.',
      image: 'assets/images/optimized/dairy_ingredients.webp',
      subItems: [
        {
          label: 'Sweeteners (Sweetness & Energy)',
          description: 'Sweeteners & Sugar Alternatives for Dairy Products: Natural & Artificial Options for Taste, Energy, and Texture in Dairy Applications',
          image: 'assets/images/optimized/Sweeteners (Sweetness & Energy).webp',
          items: [
            'Fructose / HFCS',
            'Artificial sweeteners (sucralose, aspartame)',
            'FOS Fructo-oligosachharide, Maltitol'
          ]
        },
        {
          label: 'Stabilizers & Thickeners (Texture, Mouthfeel, Stability)',
          description: 'Stabilizers & Thickeners for Texture, Mouthfeel, and Stability in Dairy Products. For Creaminess Viscosity, and Shelf-Life Extension',
          image: 'assets/images/optimized/stabilizers_thickeners2.webp',
          items: [
            'Carrageenan',
            'Guar gum',
            'Pectin',
            'CMC (Carboxymethyl cellulose)',
            'Starch'
          ]
        },
        {
          label: 'Emulsifiers (Fat Dispersion & Creaminess)',
          description: 'Emulsifiers for Stability & Creaminess in Dairy Products: Natural & Synthetic Options for Fat Dispersion, Texture Enhancement, and Shelf-Life Extension',
          image: 'assets/images/optimized/Emulsifiers1.webp',
          items: [
            'Mono & diglycerides (E471)',
            'Lecithin',
            'Polysorbate 80'
          ]
        },
        {
          label: 'Dairy Flavours',
          description: 'Premium Flavours & Natural Extracts for Dairy Applications',
          image: 'assets/images/optimized/Flavours_Dairy.webp',
          items: [
            'Almond',
            'Basundi',
            'Mango',
            'Buttermilk Spice Flavor',
            'Butterscotch',
            'Rajbhog',
            'Cardamom',
            'Chocolate',
            'Coffee',
            'Strawberry',
            'Kesar Elaichi',
            'Mawa Flavor',
            'Rabdi Flavor',
            'Rose Flavor',
            'Saffron/Kesar',
            'Vanilla Flavor'
          ]
        },
        {
          label: 'Colours (Appearance)',
          description: 'Colours for Dairy Applications',
          image: 'assets/images/optimized/Colours_(Appearance).webp',
          items: [
            'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red'
          ]
        },
        {
          label: 'Fortification Ingredients (Nutrition Enhancement)',
          description: 'Fortification Ingredients for Nutrition Enhancement in Dairy Product Applications',
          image: 'assets/images/optimized/Fortification_Ingredients.webp',
          items: [
            'Vitamins (A, D, B-complex)',
            'Minerals (calcium, iron)'
          ]
        },
        {
          label: 'Anti-Caking Agents (Flowability in Powders)',
          description: 'Anti-Caking Agents for Flow Improvement in Powdered Dairy Products',
          image: 'assets/images/optimized/Anti_Caking_Agents1.webp',
          items: [
            'Silicon dioxide',
            'Calcium silicate'
          ]
        }
      ]
    },
    'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)': {
      description: 'Beverage ingredients and additives for carbonated soft drink formulations.',
      image: 'assets/images/optimized/beverage_ingredients.webp',
      subItems: [
        {
          label: 'Sweeteners (Sweetness & Body)',
          description: 'Artificial Sweeteners for Taste & Balance in Carbonated Soft Drinks',
          image: 'assets/images/optimized/Sweeteners_Carbonated.webp',
          items: [
            'Aspartame',
            'Sucralose',
            'Acesulfame-K',
            'Saccharin',
            'Sucralose'

          ]
        },
        {
          label: 'Acidulants (Taste & pH Control)',
          description: 'Natural Acidulants for Taste & pH Control in Carbonated Soft Drinks',
          image: 'assets/images/optimized/Acidulants_Carbonated.webp',
          items: [
            'Malic acid ',
            'Sodium citrate (buffering agent)'
          ]
        },
        {
          label: 'Flavours & Flavour Emulsions (CSD Application)',
          description: 'Flavours & Flavour Emulsions for Carbonated Soft Drinks: Natural, Nature-Identical & Artificial Flavour Systems for Taste Enhancement in CSD Applications',
          image: 'assets/images/optimized/Flavours_carbonated.webp',
          items: [
            'Lahori Jeera',
            "Cloudifier White Mist Emulsion",
            "Cola Flavour Emulsion",
            "Ginger Flavour Emulsion",
            "Jeera Flavour Emulsion",
            "Lemon-Lime Flavour Emulsion",
            "Lychee Flavour Emulsion",
            "Mango Flavour Emulsion",
            "Orange Flavour Emulsion",
            "Pineapple Flavour Emulsion",
            "Red Apple Flavour",
            "Lemon Flavour",
            "Jeera Flavour"
          ]
        },
        {
          label: 'Preservatives (Shelf-Life)',
          description: 'Preservatives for Shelf-Life Extension in Carbonated Soft Drinks',
          image: 'assets/images/optimized/Preservatives_Carbonated.webp',
          items: [
            'Sodium benzoate ',
            'Potassium sorbate '
          ]
        },
        {
          label: 'Antioxidants (Prevent Oxidation)',
          description: 'Antioxidants for Oxidation Prevention in Carbonated Soft Drinks',
          image: 'assets/images/optimized/Antioxidants_Carbonated.webp',
          items: [
            'Ascorbic acid (Vitamin C) '
          ]
        },
        {
          label: 'Functional Additives (Energy Drinks / Health Positioning)',
          description: 'Functional Additives for Energy Drinks & Health Positioning in Carbonated Soft Drinks',
          image: 'assets/images/optimized/Functional_Carbonated.webp',
          items: [
            'Energy Drink Premix with Taurine, Glucoronolactone, Inositol, Caffeine and Vitamin B Blend',
            'Vitamin Premix (B-complex, Vitamin C, etc.)',
            'Electrolyte Premix (sodium, potassium, magnesium)'
          ]
        },
        {
          label: 'Colours (Appearance)',
          description: 'Vibrant & Stable Food Colours for Carbonated Soft Drinks',
          image: 'assets/images/optimized/Beverage_Colours_Carbonated.webp',
          items: [
            'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Ponceau 4R (INS 124 / E124) – Bright red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red',
            'Indigo Carmine (INS 132 / E132) – Blue',
            'Brilliant Blue FCF (INS 133 / E133) – Bright blue',
            'Fast Green FCF (INS 143 / E143) – Green',
            'Brilliant Black BN (INS 151 / E151) – Black',
            'Brown HT (INS 155 / E155) – Chocolate brown',
            'Titanium Dioxide (INS 171 / E171) – White (restricted/banned in some regions)'
          ]
        }

      ]
    },
    'Beverage Ingredients/Additives - B.Fruit Based Beverage': {
      description: 'Beverage ingredients and additives for fruit-based RTD beverages.',
      image: 'assets/images/optimized/beverage_ingredients.webp',
      subItems: [
        {
          label: 'Sweeteners (Sweetness & Mouthfeel)',
          description: 'Sweeteners for fruit-based beverages',
          image: 'assets/images/optimized/Sweeteners_fruitBased.webp',
          items: [
            'Low-calorie synthetic sweeteners - Sucralose, Aspartame, Acesulfame K,, Saccharine ',
            'Natural Sweetener - Stevia'

          ]
        },
        {
          label: 'Acidulants (Taste & pH Control)',
          description: 'pH Control & Flavour Enhancers for Fruit-Based Beverages',
          image: 'assets/images/optimized/Acidulants_fruitBased.webp',
          items: [
            'Malic acid ',
            'Sodium citrate (buffering agent)'
          ]
        },
        {
          label: 'Flavours (Taste Enhancement)',
          description: 'Flavours for Fruit-Based Beverages: Natural, Nature-Identical & Artificial Flavour Systems for Taste Enhancement in Fruit-Based Beverage Applications',
          image: 'assets/images/optimized/Flavours_fruitBased.webp',
          items: [

            'Mixed Fruit',
            'Ruh Afja',
            "Apple Flavour",
            "Blueberry Flavour",
            "Bubble Gum Flavour",
            "Energy Drink Flavour",
            "Fig Flavour",
            "Ginger Flavour",
            "Guava Flavour",
            "Jamun Flavour",
            "Jeera Masala Flavour",
            "Kiwi Flavour",
            "Lemon Flavour",
            "Lime Flavour",
            "Lychee Flavour",
            "Mango Flavour",
            "Mango Alphonso Flavour",
            "Mint Flavour",
            "Mojito Flavour",
            "Muskmelon Flavour",
            "Nimbu Pani Flavour",
            "Orange Flavour",
            "Pineapple Flavour",
            "Pomegranate Flavour",
            "Rooh Afza Flavour",
            "Strawberry Flavour",
            "Tamarind Flavour",
            "Tutti Frutti Flavour",
            "Watermelon Flavour"
          ]
        },
        {
          label: 'Stabilizers & Thickeners (Texture & Stability)',
          description: 'Stabilizers & Thickeners for Texture & Stability in Fruit-Based Beverages',
          image: 'assets/images/optimized/Stabilizers_Thickener_fruitBased.webp',
          items: [
            'Pectin',
            'CMC (Carboxymethyl cellulose) ',
            'Guar gum',
            'Xanthan gum',
            'Modified starch'
          ]
        },
        {
          label: 'Clouding Agents (Juice-like Appearance)',
          description: 'Clouding Agents for Juice-like Appearance in Fruit-Based Beverages',
          image: 'assets/images/optimized/Clouding_Agents_fruitbased.webp',
          items: [
            'Citrus oil emulsions',
            'Cloudifier Mist'
          ]
        },
        {
          label: 'Preservatives (Shelf-Life)',
          description: 'Preservatives for Shelf-Life Extension in Fruit-Based Beverages',
          image: 'assets/images/optimized/Preservatives_fruitBased1.webp',
          items: [
            'Sodium benzoate ',
            'Potassium sorbate '
          ]
        },
        {
          label: 'Antioxidants (Prevent Oxidation & Browning)',
          description: 'Antioxidants for Oxidation Prevention in Fruit-Based Beverages',
          image: 'assets/images/optimized/Antioxidants_fruitBased.webp',
          items: [
            'Ascorbic acid (Vitamin C) '
          ]
        },
        {
          label: 'Fortification Ingredients (Nutrition Enhancement)',
          description: 'Fortification ingredients for nutrition enhancement in fruit-based beverages',
          image: 'assets/images/optimized/Fortification_Ingredients_Fruitbased.webp',
          items: [
            'Vitamins - A, C, D, B-complex',
            'Minerals - calcium, iron, zinc',
            'Dietary fibre – Inulin & FOS (Fructo-Oligosaccharide)'
          ]
        },
        {
          label: 'Colours (Visual Appeal)',
          description: 'Vibrant & Stable Food Colours for Fruit-Based Beverages',
          image: 'assets/images/optimized/colours_fruitBased.webp',
          items: [
            'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Ponceau 4R (INS 124 / E124) – Bright red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red',
            'Indigo Carmine (INS 132 / E132) – Blue',
            'Brilliant Blue FCF (INS 133 / E133) – Bright blue',
            'Fast Green FCF (INS 143 / E143) – Green',
            'Brilliant Black BN (INS 151 / E151) – Black',
            'Brown HT (INS 155 / E155) – Chocolate brown',
            'Titanium Dioxide (INS 171 / E171) – White (restricted/banned in some regions)'
          ]
        }
      ]
    },
    'Seasoning Ingredients/Additives': {
      description: 'Functional specialty ingredients for seasoning systems and additives.',
      image: 'assets/images/optimized/seasoning_ingredients.webp',
      subItems: [
        {
          label: 'Sugars and Fillers',
          description: 'Functional Sugars & Bulk Fillers for Seasoning Systems',
          image: 'assets/images/optimized/Sugar_Fillers.webp', 
          items: [
            'Dextrose',
            'Lactose',
            'Maltodextrin'
          ]
        },
        {
          label: 'Flavour Enhancers (Umami & Taste Boost)',
          description: 'Flavour Enhancers for Seasoning Systems',
          image: 'assets/images/optimized/Flavour_Enhancers.webp',
          items: [
            'Monosodium glutamate (MSG)',
            'Disodium inosinate (IMP)',
            'Disodium guanylate (GMP)',
            'Yeast extract',
            'Hydrolyzed vegetable protein (HVP)'
          ]
        },
        {
          label: 'Flavouring Agents & Savoury Top Notes',
          description: 'Flavouring Agents & Savoury Top Notes for Seasoning Systems',
          image: 'assets/images/optimized/Flavouring_Agents.webp',
          items: [
            'Achari',
            'Aloo Chat',
            'Basmati Rice',
            'BBQ',
            'Biryani',
            'Blackpepper',
            'Butter',
            'Butter Garlic',
            'Spicy Buttermilk Flavor',
            'Chat Masala Flavour',
            'Cheese Flavour',
            'Cream n Onion',
            'Chilly',
            'Garlic',
            'Manchurian',
            'Schezwan',
            'Cooked Potato Flavour',
            'Fresh Coriander Leaves Flavour',
            'Fried Garlic',
            'Fried Onion',
            'Garam Masala Flavour',
            'Noodle Masala Flavour',
            'Garden Mint/Pudina Flavour',
            'Ginger Flavour',
            'Green Chilly',
            'Tomato Juicy Flavour',
            'Hing Booster',
            'Kurkure Masala Flavour',
            'Lemon Chilli',
            'Mexican Chilli',
            'Nimbu Achari',
            'Oregano Flavour',
            'Peri Peri Flavour',
            'Pizza Flavour',
            'Roasted Cumin Flavour',
            'Smoked Flavour/ Tandoori Flavour',
            'Spicy Treat Flavour',
            'Tom Yum',
            'Tomato Ketchup Flavour',
            'Bitterness Masking Flavour',
            'Sweetness Enhancer Flavour'
          ]
        },
        {
          label: 'Dairy-Based Ingredients (Creamy / Cheesy Notes)',
          description: 'Dairy-based ingredients for adding creamy and cheesy notes to foods',
          image: 'assets/images/optimized/Dairy_Based_Ingredients.webp',
          items: [
            'Cheese powder',
            'Whey powder',
            'Curd Powder',
            'Milk solids'
          ]
        },
        {
          label: 'Acidulants (Tanginess & Balance)',
          description: '“Tanginess & pH Control Solutions for Seasoning Systems',
          image: 'assets/images/optimized/Acidulants.webp',
          items: [
            'Malic acid',
            'Acetic acid '
          ]
        },
        {
          label: 'Bulking Agents / Carriers (Volume & Dispersion)',
          description: 'Bulking Agents for Seasoning Systems',
          image: 'assets/images/optimized/Bulking_Agents.webp',
          items: [
            'Maltodextrin',
            'Starch',
            'Dextrose Powder'
          ]
        },
        {
          label: 'Anti-Caking Agents (Free Flowing Powder)',
          description: 'Anti-Caking Agents for Seasoning Systems',
          image: 'assets/images/optimized/Anti_Caking.webp',
          items: [
            'Silicon dioxide',
            'Calcium silicate',
            'Tricalcium phosphate'
          ]
        },
        {
          label: 'Colours (Visual Appeal)',
          description: 'Vibrant Natural Pigments Collection for Food Applications',
          image: 'assets/images/optimized/Colours_(Visual Appeal).webp',
          items: [
            "paprika extract",
            "turmeric extract",
            "beetroot extract",
            "annatto extract",
            "chlorophyllin (green)",
            "caramel color (brown)",
            "Red & Pink (from Beetroot, Black Carrot, Purple Sweet Potato)",
            "Orange (from Carrot Juice)",
            "Yellow (from Carthamus, Turmeric Root)",
            "Green (from Chlorella, Spinach Powder)",
            "Blue (from Spirulina)",
            "Purple (from Purple Sweet Potato, Black Carrot)",
            "Brown (from Apple Extract, Malt Extract)",
            "Black (from Malt Extract)",
            "White"
          ]
        },
        {
          label: 'Functional Additives (Advanced Seasonings)',
          description: 'Functional Additives for Advanced Seasoning Solutions',
          image: 'assets/images/optimized/Functional_Additives.webp',
          items: [
            'Encapsulated flavours',
            'Smoke flavour',
            'Reaction flavours (meat-type flavours)',
            'Fat powder'
          ]
        }
      ]
    },
    'Food Colours': {
      description: 'Dried fruit and vegetable flakes for bakery, snacks, and beverage applications.',
      image: 'assets/images/optimized/dried_flakes.webp',
      subItems: [
        {
          label: 'Food Colours',
          description: 'Artificial and Natural Colours for Food Applications',
          image: 'assets/images/optimized/colours.webp',
          items: [
            'Artifial Colours (Synthetic)',
             'Tartrazine (INS 102 / E102) – Lemon yellow',
            'Sunset Yellow FCF (INS 110 / E110) – Orange-yellow',
            'Carmoisine / Azorubine (INS 122 / E122) – Red',
            'Ponceau 4R (INS 124 / E124) – Bright red',
            'Erythrosine (INS 127 / E127) – Cherry pink',
            'Allura Red AC (INS 129 / E129) – Dark red',
            'Indigo Carmine (INS 132 / E132) – Blue',
            'Brilliant Blue FCF (INS 133 / E133) – Bright blue',
            'Fast Green FCF (INS 143 / E143) – Green',
            'Brilliant Black BN (INS 151 / E151) – Black',
            'Brown HT (INS 155 / E155) – Chocolate brown',
            'Natural Colours',
            "paprika extract",
            "turmeric extract",
            "beetroot extract",
            "annatto extract",
            "chlorophyllin (green)",
            "caramel color (brown)",
            "Red & Pink (from Beetroot, Black Carrot, Purple Sweet Potato)",
            "Orange (from Carrot Juice)",
            "Yellow (from Carthamus, Turmeric Root)",
            "Green (from Chlorella, Spinach Powder)",
            "Blue (from Spirulina)",
            "Purple (from Purple Sweet Potato, Black Carrot)",
            "Brown (from Apple Extract, Malt Extract)",
            "Black (from Malt Extract)",
            "White"

            
          ]
        }
      ]
    }
  };

  subItemData: any = {};
  categories: Category[] = [];
  products: Product[] = [];
  isProductsLoading = true;
  pageSize = 8;
  currentPage = 1;
  imageFallback = 'assets/images/optimized/image-fallback.svg';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private emailService: EmailService,
    private dataService: DataService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private imagePreloadService: ImagePreloadService
  ) {

  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const group = params['group'] as string | undefined;
      const subItem = params['subItem'] as string | undefined;

      if (group) {
        this.selectProductGroup(group);
        if (subItem) {
          this.selectSubItem(subItem);
        }
        // Update SEO based on selected group and subItem
        this.updateSeoForProducts(group, subItem);
      } else {
        this.goHome();
        // Default products page SEO
        this.seoService.updateSeo({
          title: 'Products - Sparrow Food | Premium Food Ingredients & Seasonings',
          description: 'Explore our comprehensive range of premium food ingredients, seasonings, and flavorings. Perfect for food manufacturers and culinary professionals.',
          keywords: 'food ingredients, seasonings, flavorings, spices, food manufacturing, beverage ingredients, bakery additives',
          canonicalUrl: 'https://sparrowfood.com/products',
          breadcrumb: [
            { name: 'Home', url: 'https://sparrowfood.com' },
            { name: 'Products', url: 'https://sparrowfood.com/products' }
          ]
        });
      }
    });

    this.loadData();
  }

  private updateSeoForProducts(group: string, subItem?: string): void {
    const groupTitles: { [key: string]: string } = {
      'Seasoning': 'Seasonings - Sparrow Food | Premium Food Seasonings',
      'Dried Fruit & Vegetable Flakes': 'Dried Fruit & Vegetable Flakes - Sparrow Food',
      'Fruit & Vegetable Powders': 'Fruit & Vegetable Powders - Sparrow Food',
      'Tea,Coffee & Milk Premixes': 'Tea, Coffee & Milk Premixes - Sparrow Food',
      'Instant Drink Beverage Premixes': 'Instant Drink Beverage Premixes - Sparrow Food',
      'Mixes for Cocktail Beverages': 'Cocktail Beverage Mixes - Sparrow Food',
      'Powdered Salts': 'Powdered Salts - Sparrow Food',
      'Flavours (Liquid & Spray Dried Powder)': 'Flavors & Extracts - Sparrow Food',
      'Bakery Ingredients/Additives': 'Bakery Ingredients & Additives - Sparrow Food',
      'Confectionery Ingredients/Additives': 'Confectionery Ingredients & Additives - Sparrow Food',
      'Dairy Product Ingredients/Additives': 'Dairy Product Ingredients & Additives - Sparrow Food',
      'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)': 'Carbonated Soft Drink Ingredients - Sparrow Food',
      'Beverage Ingredients/Additives - B.Fruit Based Beverage': 'Fruit Based Beverage Ingredients - Sparrow Food',
      'Seasoning Ingredients/Additives': 'Seasoning Ingredients & Additives - Sparrow Food',
      'Food Colours': 'Food Colors - Sparrow Food'
    };

    const groupDescriptions: { [key: string]: string } = {
      'Seasoning': 'Premium seasoning blends for extruded snacks, namkeen, potato chips, noodles, and pasta. High-quality flavor solutions for food manufacturers.',
      'Dried Fruit & Vegetable Flakes': 'Natural dried fruit and vegetable flakes for food manufacturing. Premium quality ingredients for various food applications.',
      'Fruit & Vegetable Powders': 'Pure and natural fruit and vegetable powders. Perfect for food manufacturers seeking high-quality powdered ingredients.',
      'Tea,Coffee & Milk Premixes': 'Instant premixes for tea, coffee, and milk beverages. Convenient solutions for beverage manufacturers.',
      'Instant Drink Beverage Premixes': 'Refreshing instant beverage mixes for various drink applications. Quality premixes for beverage production.',
      'Mixes for Cocktail Beverages': 'Exotic and tangy cocktail beverage mixes. Premium ingredients for cocktail and beverage manufacturers.',
      'Powdered Salts': 'Natural mineral salt selections in powdered form. High-quality salt products for food manufacturing.',
      'Flavours (Liquid & Spray Dried Powder)': 'Premium flavors and natural extracts in liquid and spray-dried powder forms.',
      'Bakery Ingredients/Additives': 'Essential additives for perfect baking. Quality ingredients for bakery product manufacturers.',
      'Confectionery Ingredients/Additives': 'Texture, color, and flavor solutions for confectionery products. Premium additives for confectionery manufacturing.',
      'Dairy Product Ingredients/Additives': 'Texture, taste, and stability solutions for dairy products. Quality additives for dairy manufacturers.',
      'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)': 'Premium ingredients for carbonated soft drinks. Quality additives for CSD manufacturers.',
      'Beverage Ingredients/Additives - B.Fruit Based Beverage': 'Natural additives for fruit-based beverages. Premium ingredients for fruit beverage manufacturers.',
      'Seasoning Ingredients/Additives': 'Taste enhancers and functional additives for seasonings. Quality ingredients for seasoning manufacturers.',
      'Food Colours': 'Food-grade colors for various food applications. Premium color solutions for food manufacturers.'
    };

    let title = groupTitles[group] || 'Products - Sparrow Food';
    let description = groupDescriptions[group] || 'Premium food ingredients and seasonings from Sparrow Food.';
    let keywords = 'food ingredients, seasonings, flavorings, food manufacturing';
    let canonicalUrl = `https://sparrowfood.com/products?group=${encodeURIComponent(group)}`;
    let breadcrumb: Array<{ name: string; url: string }> = [
      { name: 'Home', url: 'https://sparrowfood.com' },
      { name: 'Products', url: 'https://sparrowfood.com/products' },
      { name: group, url: canonicalUrl }
    ];

    if (subItem) {
      title = `${subItem} - ${group} | Sparrow Food`;
      description = `Premium ${subItem} seasoning for ${group}. High-quality food ingredients from Sparrow Food.`;
      canonicalUrl += `&subItem=${encodeURIComponent(subItem)}`;
      breadcrumb.push({ name: subItem, url: canonicalUrl });
    }

    this.seoService.updateSeo({
      title,
      description,
      keywords,
      canonicalUrl,
      breadcrumb,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: description,
        url: canonicalUrl,
        provider: {
          '@type': 'Organization',
          name: 'Sparrow Food'
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.dataService.getCategories().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.categories = data;
      this.cdr.markForCheck();
    });
    this.dataService.getSubItemData().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.subItemData = data;
      this.cdr.markForCheck();
    });
    this.dataService.getProducts().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.products = data;
        this.cdr.markForCheck();
        
        // PERFORMANCE: Start preloading all product images in background
        // This ensures instant display when user clicks/switches products
        this.imagePreloadService.preloadAllProductImages(data).catch(() => {
          // Silently handle preload errors
        });
      },
      complete: () => {
        this.isProductsLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // TrackBy functions for performance
  trackByGroup(index: number, group: string): string {
    return group || index.toString();
  }

  trackBySubItem(index: number, subItem: string): string {
    return subItem || index.toString();
  }

  trackByProduct(index: number, product: Product): string {
    return product.name || index.toString();
  }

  get displayedProducts(): Product[] {
    return this.filteredProducts.slice(0, this.currentPage * this.pageSize);
  }

  get hasMoreProducts(): boolean {
    return this.filteredProducts.length > this.displayedProducts.length;
  }

  loadMoreProducts(): void {
    this.currentPage++;
    this.cdr.markForCheck();
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  getWebpPath(image: string): string {
    if (!image) {
      return this.imageFallback;
    }
    return image
      .replace(/assets\/images\/(?:optimized\/)?/, 'assets/images/optimized/')
      .replace(/\.(jpe?g|png|gif|svg)$/i, '.webp');
  }

  getOptimizedImage(image: string): string {
    return image || this.imageFallback;
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src.indexOf(this.imageFallback) === -1) {
      img.src = this.imageFallback;
    }
  }

  get selectedCategoryObject() {
    return this.categories.find(c => c.key === this.selectedCategory);
  }

  get currentSubItems() {
    if (this.selectedCategory) {
      return this.selectedCategoryObject?.subItems || [];
    }
    if (!this.selectedGroup) {
      return [];
    }
    const definition = this.groupDefinitions[this.selectedGroup];
    return definition?.subItems.map((sub: { label: string }) => sub.label) || [];
  }

  get selectedGroupDefinition() {
    if (!this.selectedGroup) {
      return null;
    }
    return this.groupDefinitions[this.selectedGroup] || null;
  }

  // get selectedGroupSubItemObject(){
  //   if (!this.selectedGroupDefinition) {
  //     return null;
  //   }
  //   return this.selectedGroupDefinition.subItems.find((sub: { label: string }) => sub.label === this.selectedGroupSubItem) || null;
  // }
  // Return the full subItem object
  // Full object for sub-item
  get selectedGroupSubItemObject(): { label: string; description?: string; image?: string; items: string[] } | null {
    if (!this.selectedGroup || !this.selectedGroupSubItem) {
      return null;
    }

    const groupDef = this.groupDefinitions[this.selectedGroup];
    if (!groupDef) {
      return null;
    }

    return groupDef.subItems.find(
      (s: { label: string }) => s.label === this.selectedGroupSubItem
    ) || null;
  }

  // Image string for template binding
  get selectedGroupSubItemImage(): string {
    return this.selectedGroupSubItemObject?.image || this.selectedGroupDefinition?.image || '/assets/images/default.jpg';
  }



  // Return the items array
  get selectedGroupSubItemItems(): string[] {
    return this.selectedGroupSubItemObject?.items || [];
  }

  // Return just the image string



  get isSubItemSelectionActive(): boolean {
    return !!(
      (this.selectedCategory && this.selectedSubItem) ||
      (this.selectedGroup && this.selectedGroupSubItem)
    );
  }

  get categoryLabel() {
    if (this.selectedCategory) {
      return this.selectedCategoryObject?.label || '';
    }
    return this.selectedGroup || '';
  }

  get categoryDescription() {
    if (this.selectedCategory) {
      return this.selectedCategoryObject?.description || '';
    }
    return this.selectedGroupDefinition?.description || '';
  }

  get categoryHeroClass() {
    if (this.selectedCategory) {
      return this.selectedCategoryObject?.styleClass || '';
    }
    return this.selectedGroup ? 'default-hero' : '';
  }

  goTo(category: string) {
    this.resetPagination();
    this.showMenu = false;
    this.selectedCategory = category;
    this.selectedGroup = '';
    this.selectedGroupSubItem = '';
    this.selectedProduct = null;

    const categoryData = this.categories.find(c => c.key === category);
    if (categoryData?.subItems?.length) {
      this.selectedSubItem = categoryData.subItems[0];
      this.showSubItemList = true;
    } else {
      this.selectedSubItem = '';
      this.showSubItemList = false;
    }
  }

  selectProductGroup(group: string) {
    this.resetPagination();
    this.showMenu = false;
    this.selectedGroup = group;
    this.selectedCategory = '';
    this.selectedSubItem = '';
    this.selectedProduct = null;

    const groupDefinition = this.groupDefinitions[group];
    if (groupDefinition?.subItems?.length === 1) {
      this.selectedGroupSubItem = groupDefinition.subItems[0].label;
      this.showSubItemList = true;
    } else {
      this.selectedGroupSubItem = '';
      this.showSubItemList = false;
    }

    this.cdr.markForCheck();
    this.scrollToProductDetails();
  }

  selectSubItem(subItem: string) {
    this.resetPagination();

    if (this.selectedCategory) {
      this.selectedSubItem = subItem;
      this.showSubItemList = true;
      this.selectedProduct = null;
      this.cdr.markForCheck();
      this.scrollToProductsGrid();
      
      // PERFORMANCE: Preload images for current category
      const categoryProducts = this.getSubItemItems();
      this.imagePreloadService.preloadImages(categoryProducts).catch(() => {});
      return;
    }

    this.selectedGroupSubItem = subItem;
    this.selectedGroup = this.selectedGroup || '';
    this.showSubItemList = true;
    this.selectedProduct = null;
    this.cdr.markForCheck();
    this.scrollToSubitemLandingSection();

    // No assignment to selectedGroupSubItemObject; it's a getter
  }

  private scrollToElementById(elementId: string, maxAttempts = 60) {
    let attempts = 0;

    const scrollToTarget = () => {
      const target = document.getElementById(elementId);
      if (target) {
        const header = document.querySelector('header.navbar');
        const offset = header ? header.getBoundingClientRect().height + 16 : 88;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth'
        });
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        window.requestAnimationFrame(scrollToTarget);
      }
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToTarget));
  }

  scrollToProductsGrid() {
    this.scrollToElementById('products-grid-section');
  }

  scrollToSubitemLandingSection() {
    this.scrollToElementById('subitem-landing-section');
  }

  scrollToProductDetails() {
    this.scrollToElementById('product-detail-view');
  }

  goHome() {
    this.resetPagination();
    this.showMenu = true;
    this.selectedCategory = '';
    this.selectedSubItem = '';
    this.showSubItemList = false;
    this.selectedProduct = null;
  }

  // getSubItemImage(): string {
  //   if (this.selectedSubItem === 'Snacks') {
  //     return 'assets/images/optimized/extruded_snack.webp'; // 👈 PUT YOUR IMAGE HERE
  //   }
  //   return 'assets/images/default.jpg';
  // }
  getSubItemItems(): string[] {
    return this.subItemData[this.selectedSubItem]?.items || [];
  }

  getSubItemImage(): string {
    return this.subItemData[this.selectedSubItem]?.image || '/assets/images/default.jpg';
  }

  get selectedGroupProductFallback(): Product[] {
    if (!this.selectedGroup || !this.selectedGroupSubItem) {
      return [];
    }

    const packagingOnlySubItems = ['Extruded Snacks', 'Potato Chips'];
    const matchedProducts = this.products.filter(
      (product) => product.subItem === this.selectedGroupSubItem
    );

    if (matchedProducts.length && !packagingOnlySubItems.includes(this.selectedGroupSubItem)) {
      return matchedProducts;
    }

    const groupLabel = this.selectedGroup || '';
    const subItemLabel = this.selectedGroupSubItem || '';

    return this.selectedGroupSubItemItems.map((itemName) => ({
      name: itemName,
      category: groupLabel,
      subItem: subItemLabel,
      brand: 'Sparrow Food Industries',
      packSize: 'Standard',
      shelfLife: 'TBD',
      moq: 'Contact us',
      freight: 'Actual',
      image: this.selectedGroupSubItemImage,
      fallback: true
    }));
  }

  get filteredProducts(): Product[] {
    if (this.selectedCategory && this.selectedSubItem) {
      return this.products.filter(
        (product) =>
          product.category === this.selectedCategory &&
          product.subItem === this.selectedSubItem
      );
    }

    if (this.selectedGroup && this.selectedGroupSubItem) {
      return this.selectedGroupProductFallback;
    }

    return [];
  }

  // Groups that show only Powdered Packaging
  private powderedOnlyGroups = [
    'Seasoning',
    'Dried Fruit & Vegetable Flakes',
    'Fruit & Vegetable Powders',
    'Tea,Coffee & Milk Premixes',
    'Instant Drink Beverage Premixes',
    'Mixes for Cocktail Beverages',
    'Powdered Salts'
  ];

  // Groups that show both Liquid and Powdered Packaging
  private liquidAndPowderGroups = [
    'Flavours (Liquid & Spray Dried Powder)',
    'Bakery Ingredients/Additives',
    'Confectionery Ingredients/Additives',
    'Dairy Product Ingredients/Additives',
    'Beverage Ingredients/Additives - A.Carbonated Soft Drink (CSD)',
    'Beverage Ingredients/Additives - B.Fruit Based Beverage',
    'Seasoning Ingredients/Additives',
    'Food Colours'
  ];

  get showOnlyPowderedPackaging(): boolean {
    return this.selectedGroup !== null &&
      this.powderedOnlyGroups.includes(this.selectedGroup);
  }

  get showBothPackaging(): boolean {
    return this.selectedGroup !== null &&
      this.liquidAndPowderGroups.includes(this.selectedGroup);
  }

  get showFallbackPackaging(): boolean {
    return this.filteredProducts.length > 0 && this.filteredProducts.every(product => product.fallback);
  }

  preloadImage(src: string) {
    if (!src) {
      return;
    }
    
    // Use optimized preloading service
    this.imagePreloadService.preloadImage(src).catch(() => {
      // Silently handle errors
    });
  }

  selectProduct(product: Product) {
    // PERFORMANCE: Preload current product image immediately
    this.preloadImage(product.image);
    this.selectedProduct = product;
    this.cdr.markForCheck();
    
    // PERFORMANCE: Smart preload next and previous products for instant switching
    const currentIndex = this.filteredProducts.indexOf(product);
    if (currentIndex !== -1) {
      this.imagePreloadService.smartPreloadAround(this.filteredProducts, currentIndex, 2).catch(() => {});
    }
  }

  openInquiryModal(product: Product) {
    this.inquiryProduct = product;
    this.showInquiryModal = true;
    this.inquiryStatus = '';
    this.inquiryStatusType = '';
  }

  closeInquiryModal() {
    this.showInquiryModal = false;
    this.inquiryProduct = null;
    this.inquiryForm = {
      name: '',
      email: '',
      message: ''
    };
    this.inquiryStatusType = '';
  }

  submitInquiry() {
    const name = this.inquiryForm.name.trim();
    const email = this.inquiryForm.email.trim();
    const message = this.inquiryForm.message.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !message) {
      this.inquiryStatusType = 'error';
      this.inquiryStatus = 'Please fill in Name, Email and Message before submitting.';
      return;
    }

    if (!emailPattern.test(email)) {
      this.inquiryStatusType = 'error';
      this.inquiryStatus = 'Please enter a correct email address (e.g., example@domain.com).';
      return;
    }

    this.inquiryStatusType = '';
    this.inquiryStatus = 'Sending inquiry...';
    this.isInquirySubmitting = true;

    this.emailService.sendInquiryEmail({
      name,
      email,
      message
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isInquirySubmitting = false;
        this.inquiryStatusType = 'success';
        this.inquiryStatus = 'Thank you! Your inquiry has been submitted. We will contact you with further instructions.';
        this.inquiryForm = {
          name: '',
          email: '',
          message: ''
        };
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isInquirySubmitting = false;
        this.inquiryStatusType = 'error';
        if (error.error && error.error.error) {
          this.inquiryStatus = error.error.error;
        } else {
          this.inquiryStatus = 'Unable to send inquiry right now. Please try again later.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  inquire(product: Product) {
    this.openInquiryModal(product);
  }
}
