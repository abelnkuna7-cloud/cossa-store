begin;

update public.store_products
set brand='Astrum', category='technology-electronics', additional_categories=array['audio','headphones'],
    seo_title='Astrum MX Pro Hybrid ANC Bluetooth Headphones Black | Cossa Store', updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A11561-B';

update public.store_products
set brand='Astrum', category='technology-electronics', additional_categories=array['audio','headphones'],
    seo_title='Astrum MZ Pro Hybrid ANC Bluetooth Headphones Black | Cossa Store', updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A11562-B';

update public.store_products set
 short_description='Slim multi-mode wireless keyboard with touchpad, Bluetooth/Wi-Fi connections, pairing for up to three devices, RGB backlighting, silent keys and spill resistance.',
 description='The Astrum KT210 is a slim multi-mode wireless keyboard with an integrated touchpad. It can pair with up to three compatible devices and switch between them, with Bluetooth/Wi-Fi connectivity, silent keys, spill resistance and multi-colour backlighting. Astrum specifies up to 160 hours of working time and compatibility with Windows, macOS, ChromeOS, Linux and Android.',
 customer_features='["Smooth multipoint touchpad","QWERTY layout with multimedia hotkeys","Dual Bluetooth/Wi-Fi connection options","Pair and switch between up to three devices","Multi-colour LED backlighting with adjustable brightness","Spill-resistant design","Silent keys","Readable engraved keycaps","Adjustable tilt legs","Windows, macOS, ChromeOS, Linux and Android compatibility"]'::jsonb,
 customer_specifications='Working range: up to 10 m\nDimensions: 365 x 136 x 15 mm\nWeight: approximately 370 g',
 seo_title='Astrum KT210 Wireless Keyboard with Touchpad | Cossa Store',
 seo_description='Astrum KT210 wireless keyboard with touchpad, multi-device pairing, Bluetooth/Wi-Fi connectivity, RGB backlighting, silent keys and spill resistance.',
 brand='Astrum', category='technology-electronics', additional_categories=array['computer-accessories','productivity-equipment'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A51021-B';

update public.store_products set
 short_description='Indoor 2K Quad HD Wi-Fi security camera with app control, two-way audio, infrared night vision, 355° pan, 90° tilt and TF card support up to 128GB.',
 description='The Astrum IP110 is an indoor smart security camera for home and office monitoring. It connects over 2.4GHz Wi-Fi and supports remote app control, 2K Quad HD video, infrared night vision, two-way audio, 355° pan and 90° tilt. Recordings can be stored in the cloud or on a TF card up to 128GB, and the app supports compatible iOS and Android devices.',
 customer_features='["Remote mobile app control over 2.4GHz Wi-Fi","Built-in microphone and speaker for two-way communication","2K Quad HD video with infrared night vision","Cloud storage and TF card support up to 128GB","iOS and Android app compatibility","355° pan and 90° tilt controlled from the mobile app"]'::jsonb,
 customer_specifications='Resolution: 2560 x 1440 Quad HD\nRecording: H.265\nLens: 3.6 mm\nPan: up to 355°\nTilt: up to 90°\nPower: 5V USB-C\nTF card: up to 128GB\nConnectivity: Wi-Fi 2.4GHz\nDimensions: 84 x 84 x 118 mm\nWeight: approximately 340 g',
 seo_title='Astrum IP110 2K Wi-Fi Security Camera | Cossa Store',
 seo_description='Astrum IP110 indoor 2K Wi-Fi security camera with night vision, two-way audio, mobile app control, pan/tilt and TF card support up to 128GB.',
 brand='Astrum', category='security-smart-home', additional_categories=array['cctv-cameras','security-systems'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A63011-Q';

update public.store_products set
 short_description='High-speed USB 1D/2D barcode scanner with handheld and continuous scanning modes, automatic sensing and an included stand.',
 description='The Astrum BS120 is a plug-and-play USB barcode scanner for POS systems, computers and cash registers. It supports manual handheld and continuous scanning, includes a flexible stand and uses a high-speed processor rated by Astrum at 260 scans per second. It decodes standard 1D formats and major 2D formats including QR Code, Data Matrix, Aztec and MaxiCode.',
 customer_features='["Continuous handheld barcode scanning","Comfortable handheld grip","Stand included for fixed-position use","High-speed, high-precision scanning","1D and 2D barcode decoding","Strong anti-interference capability","USB plug-and-play connection"]'::jsonb,
 customer_specifications='Interface: USB\nImage sensor: 640 x 480 pixels\nMaximum resolution: 0.102 mm / 4 mil\nPower input: 5V, 2.7A\nIndicators: LED and buzzer\nDimensions: 70 x 120 x 180 mm\nWeight: approximately 200 g',
 seo_title='Astrum BS120 2D USB Barcode Scanner with Stand | Cossa Store',
 seo_description='Astrum BS120 USB barcode scanner with stand, high-speed 1D/2D decoding, plug-and-play connection and handheld or continuous scanning modes.',
 brand='Astrum', category='technology-electronics', additional_categories=array['productivity-equipment','computer-accessories'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A70012-B';

update public.store_products set
 short_description='Compact USB-C to RJ45 Gigabit Ethernet adapter with plug-and-play setup, LED indicators and support for Windows, macOS, Linux and Chromebook.',
 description='The Astrum NA450 adds wired Ethernet connectivity to USB-C laptops and compatible devices that do not have an RJ45 port. Its compact metal design is intended for portable use, with plug-and-play operation, LED indicators and support for IPv4/IPv6 networking across multiple operating systems.',
 customer_features='["USB-C to RJ45 wired network connectivity","Plug-and-play operation with LED indicators","Supports IPv4 and IPv6 network protocols","Compact metal casing","Windows, macOS, Linux and Chromebook support"]'::jsonb,
 customer_specifications='Interface: USB-C\nUSB transfer capability: up to 5Gbps\nOS support: Windows 7/8/10, macOS, Linux, Chromebook\nProduct weight: approximately 30 g',
 seo_title='Astrum NA450 USB-C Gigabit Ethernet Adapter | Cossa Store',
 seo_description='Astrum NA450 compact USB-C to Gigabit Ethernet adapter with plug-and-play setup, LED indicators and multi-OS support.',
 brand='Astrum', category='technology-electronics', additional_categories=array['networking','computer-accessories'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A72045-B';

update public.store_products set
 short_description='130W USB-C Power Delivery charger for compatible laptops and mobile devices, with adaptive charging and built-in electrical protection.',
 description='The Astrum CL770 is a 130W USB-C Power Delivery charger designed for compatible Dell laptops and other USB-C devices. It supports adaptive PD output from 5V to 20V according to device requirements and includes protection against over-current, over-voltage, overheating and short circuits. Its compact design is suited to work, replacement-charger and travel use.',
 customer_features='["Up to 130W USB-C Power Delivery","Adaptive 5V to 20V output according to device requirements","Up to 6.5A output","Designed for compatible Dell and other USB-C PD laptops/devices","Over-current, over-voltage, overheating and short-circuit protection","Compact travel-friendly design"]'::jsonb,
 customer_specifications='Maximum power: 130W\nUSB-C PD output: up to 20V\nMaximum output current: up to 6.5A',
 seo_title='Astrum CL770 130W USB-C Laptop Charger | Cossa Store',
 seo_description='Astrum CL770 130W USB-C PD laptop charger with adaptive power delivery and built-in over-current, over-voltage, heat and short-circuit protection.',
 brand='Astrum', category='technology-electronics', additional_categories=array['power-charging','cables-adapters'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A90577-B';

update public.store_inventory_intakes
set source_url='https://astrum.co.za/product/duoz-pro10-tws-earbuds-hybrid-anc-6mic-b/'
where supplier_id='3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid and supplier_product_ref='ATWDP10B';

update public.store_products set
 short_description='Hybrid ANC true-wireless earbuds with ENC call microphones, Bluetooth 6.0, game/music modes, up to 40 hours total playtime and USB-C fast charging.',
 description='The Astrum DUOZ PRO10 combines Hybrid Active Noise Cancelling with ENC microphones for clearer calls. Bluetooth 6.0 supports low-latency game mode, music, transparency and ANC modes. Astrum specifies up to 8 hours of playback from the earbuds and up to 40 hours total with the charging case, with USB-C fast charging and an ergonomic lightweight design.',
 customer_features='["Hybrid Active Noise Cancelling","4-microphone ENC for call clarity","Bluetooth 6.0 with 10m wireless range","Game, music, transparency and ANC modes","Up to 8 hours earbud playtime and 40 hours total with case","USB-C fast charging","Lightweight ergonomic design","Multi-function control for calls, playback and mode switching"]'::jsonb,
 customer_specifications='Bluetooth: 6.0\nPlay time: up to 8 h (40 h with case)\nCharging time: approximately 1.5 h\nFrequency response: 20Hz–20kHz\nWireless range: 10 m\nEarbud battery: 60mAh each\nCase battery: 500mAh\nInput: USB-C 5V/1A',
 seo_title='Astrum DUOZ PRO10 Hybrid ANC Earbuds Black | Cossa Store',
 seo_description='Astrum DUOZ PRO10 black true-wireless earbuds with Hybrid ANC, ENC calls, Bluetooth 6.0, gaming mode, 40-hour total playtime and USB-C charging.',
 brand='Astrum', category='technology-electronics', additional_categories=array['audio','headphones'], updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='ATWDP10B';

update public.store_inventory_intakes i
set short_description=p.short_description,
    description=p.description,
    specifications=p.customer_specifications,
    category=p.category,
    brand=p.brand,
    features=p.customer_features,
    additional_categories=p.additional_categories,
    operational_notes=coalesce(i.operational_notes,'') || E'\nContent-quality repair: manufacturer-supported description/features and Cossa taxonomy verified 2026-09-11.'
from public.store_products p
where i.publication_store_product_id=p.id
  and i.supplier_id='3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid
  and p.supplier_name='Astrum';

commit;
