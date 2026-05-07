from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="Hyperlocal Commerce API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =====================
# Mock Catalog
# =====================
def _p(id_, name, price, image, **kwargs):
    return {
        "id": id_,
        "name": name,
        "price": price,
        "image": image,
        "unit": kwargs.get("unit", ""),
        "tag": kwargs.get("tag", ""),
        "description": kwargs.get("description", ""),
    }


CATALOG = {
    "categories": [
        {
            "id": "liquor",
            "name": "Liquor",
            "tagline": "Premium spirits & beers",
            "icon": "🍻",
            "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
            "min_order": 1000,
            "subgroups": [
                {
                    "id": "beer",
                    "name": "Beer",
                    "products": [
                        _p("kf-strong", "Kingfisher Strong", 180, "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80", unit="650ml"),
                        _p("kf-ultra", "Kingfisher Ultra", 220, "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=600&q=80", unit="650ml"),
                        _p("budweiser", "Budweiser Magnum", 260, "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?auto=format&fit=crop&w=600&q=80", unit="650ml"),
                        _p("heineken", "Heineken", 290, "https://images.unsplash.com/photo-1613521973937-efbb6a3f02b1?auto=format&fit=crop&w=600&q=80", unit="500ml"),
                        _p("corona", "Corona Extra", 350, "https://images.unsplash.com/photo-1600788907416-456578634209?auto=format&fit=crop&w=600&q=80", unit="355ml"),
                    ],
                },
                {
                    "id": "whisky",
                    "name": "Whisky",
                    "products": [
                        _p("blenders-pride", "Blender's Pride", 1250, "https://images.unsplash.com/photo-1582819509237-d6c46ee03f7d?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("royal-stag", "Royal Stag", 850, "https://images.unsplash.com/photo-1574767606693-4ca27a967072?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("jameson", "Jameson Irish", 2900, "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("jack-daniels", "Jack Daniel's", 3200, "https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("glenfiddich", "Glenfiddich 12", 5400, "https://images.unsplash.com/photo-1564675181161-ea9d92a6e188?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                    ],
                },
                {
                    "id": "vodka",
                    "name": "Vodka",
                    "products": [
                        _p("magic-moments", "Magic Moments", 750, "https://images.unsplash.com/photo-1614113598860-3eda3aa7df7c?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("smirnoff", "Smirnoff Red", 1100, "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("absolut", "Absolut", 1900, "https://images.unsplash.com/photo-1620219365994-f334c3e9a9a3?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("greygoose", "Grey Goose", 5800, "https://images.unsplash.com/photo-1608885898957-91d2c66b1be3?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                    ],
                },
                {
                    "id": "rum",
                    "name": "Rum",
                    "products": [
                        _p("old-monk", "Old Monk", 480, "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("bacardi-white", "Bacardi White", 1100, "https://images.unsplash.com/photo-1605270012917-bf357a1fae9e?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("captain-morgan", "Captain Morgan", 1450, "https://images.unsplash.com/photo-1560508601-5dd47fcebafe?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                    ],
                },
                {
                    "id": "gin",
                    "name": "Gin",
                    "products": [
                        _p("blue-riband", "Blue Riband", 700, "https://images.unsplash.com/photo-1551734413-83e7e96f7ca0?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("bombay-sapphire", "Bombay Sapphire", 2400, "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                        _p("hapusa", "Hapusa Himalayan", 3700, "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80", unit="750ml"),
                    ],
                },
            ],
        },
        {
            "id": "cigarettes",
            "name": "Cigarettes",
            "tagline": "Full packs only · 21+",
            "icon": "🚬",
            "image": "https://images.unsplash.com/photo-1527015175922-36a306cf0e20?auto=format&fit=crop&w=900&q=80",
            "min_order": 0,
            "full_pack_only": True,
            "subgroups": [
                {
                    "id": "cigs",
                    "name": "Full Packs",
                    "products": [
                        _p("marlboro-advance", "Marlboro Advance", 360, "https://images.unsplash.com/photo-1570166651579-f86adb1c1d2e?auto=format&fit=crop&w=600&q=80", unit="Pack of 20", tag="Full Pack Only"),
                        _p("marlboro-gold", "Marlboro Gold", 380, "https://images.unsplash.com/photo-1573575155376-b5010099301b?auto=format&fit=crop&w=600&q=80", unit="Pack of 20", tag="Full Pack Only"),
                        _p("classic-mild", "Classic Mild", 340, "https://images.unsplash.com/photo-1562552052-c5d4f4d3b1d8?auto=format&fit=crop&w=600&q=80", unit="Pack of 20", tag="Full Pack Only"),
                        _p("gold-flake-kings", "Gold Flake Kings", 360, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80", unit="Pack of 20", tag="Full Pack Only"),
                        _p("benson-hedges", "Benson & Hedges", 420, "https://images.unsplash.com/photo-1528396518501-b53b21d2cd83?auto=format&fit=crop&w=600&q=80", unit="Pack of 20", tag="Full Pack Only"),
                    ],
                },
            ],
        },
        {
            "id": "snacks",
            "name": "Snacks",
            "tagline": "Munchies for the night",
            "icon": "🍿",
            "image": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80",
            "min_order": 0,
            "subgroups": [
                {
                    "id": "chips",
                    "name": "Chips",
                    "products": [
                        _p("lays-classic", "Lay's Classic Salted", 30, "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80", unit="52g"),
                        _p("lays-magic", "Lay's Magic Masala", 30, "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?auto=format&fit=crop&w=600&q=80", unit="52g"),
                        _p("kurkure", "Kurkure Masala Munch", 20, "https://images.unsplash.com/photo-1614813619404-b4d4c8f1b15e?auto=format&fit=crop&w=600&q=80", unit="40g"),
                        _p("doritos", "Doritos Sweet Chilli", 60, "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80", unit="60g"),
                    ],
                },
                {
                    "id": "nuts",
                    "name": "Nuts",
                    "products": [
                        _p("haldiram-peanuts", "Haldiram Peanuts", 60, "https://images.unsplash.com/photo-1599599810694-57a2ca8276a8?auto=format&fit=crop&w=600&q=80", unit="200g"),
                        _p("almonds", "Roasted Almonds", 220, "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=600&q=80", unit="200g"),
                        _p("cashews", "Salted Cashews", 320, "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=80", unit="200g"),
                    ],
                },
                {
                    "id": "chocolates",
                    "name": "Chocolates",
                    "products": [
                        _p("dairy-milk", "Cadbury Dairy Milk", 50, "https://images.unsplash.com/photo-1623461487986-9400110de28e?auto=format&fit=crop&w=600&q=80", unit="55g"),
                        _p("snickers", "Snickers", 70, "https://images.unsplash.com/photo-1551944073-d1f3a3f9b1fe?auto=format&fit=crop&w=600&q=80", unit="50g"),
                        _p("kitkat", "Kitkat 4-Finger", 40, "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=600&q=80", unit="38g"),
                    ],
                },
                {
                    "id": "drinks",
                    "name": "Soft Drinks",
                    "products": [
                        _p("coke", "Coca-Cola", 40, "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80", unit="500ml"),
                        _p("thums-up", "Thums Up", 40, "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=600&q=80", unit="500ml"),
                        _p("redbull", "Red Bull", 125, "https://images.unsplash.com/photo-1613470207891-21f2f0d2c80f?auto=format&fit=crop&w=600&q=80", unit="250ml"),
                        _p("sprite", "Sprite", 40, "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=600&q=80", unit="500ml"),
                    ],
                },
            ],
        },
        {
            "id": "food",
            "name": "Food",
            "tagline": "Hot & ready · 30 min delivery",
            "icon": "🍔",
            "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
            "min_order": 0,
            "subgroups": [
                {
                    "id": "burgers",
                    "name": "Burgers",
                    "products": [
                        _p("classic-cheeseburger", "Classic Cheeseburger", 199, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"),
                        _p("paneer-burger", "Crispy Paneer Burger", 179, "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?auto=format&fit=crop&w=600&q=80"),
                        _p("chicken-burger", "Loaded Chicken Burger", 249, "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=600&q=80"),
                    ],
                },
                {
                    "id": "wings",
                    "name": "Chicken Wings",
                    "products": [
                        _p("peri-wings", "Peri Peri Wings (8 pcs)", 329, "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=600&q=80"),
                        _p("bbq-wings", "BBQ Wings (8 pcs)", 349, "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80"),
                        _p("hot-wings", "Hot Buffalo Wings (8 pcs)", 349, "https://images.unsplash.com/photo-1626078436204-cc8c0042135a?auto=format&fit=crop&w=600&q=80"),
                    ],
                },
                {
                    "id": "pizza",
                    "name": "Pizza",
                    "products": [
                        _p("margherita", "Margherita (Medium)", 299, "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80"),
                        _p("pepperoni", "Pepperoni (Medium)", 449, "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?auto=format&fit=crop&w=600&q=80"),
                        _p("veggie-supreme", "Veggie Supreme (Medium)", 379, "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=600&q=80"),
                    ],
                },
                {
                    "id": "fries",
                    "name": "Fries",
                    "products": [
                        _p("classic-fries", "Classic Salted Fries", 99, "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80"),
                        _p("peri-fries", "Peri Peri Fries", 129, "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80"),
                        _p("cheese-fries", "Cheese Loaded Fries", 179, "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=600&q=80"),
                    ],
                },
                {
                    "id": "rolls",
                    "name": "Rolls",
                    "products": [
                        _p("paneer-roll", "Paneer Tikka Roll", 149, "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80"),
                        _p("chicken-roll", "Chicken Seekh Roll", 169, "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80"),
                        _p("egg-roll", "Egg Roll", 119, "https://images.unsplash.com/photo-1601050690294-46f8b9e7e7e3?auto=format&fit=crop&w=600&q=80"),
                    ],
                },
            ],
        },
    ]
}


@api_router.get("/")
async def root():
    return {"message": "Hyperlocal Commerce API", "version": "1.0"}


@api_router.get("/catalog")
async def get_catalog():
    return CATALOG


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
