export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_offers: {
        Row: {
          commission_rate: number | null
          commission_type: string
          created_at: string
          disclosure_text: string | null
          id: string
          is_active: boolean
          partner_name: string
          partner_network: string | null
          product_id: string
          tracking_url: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          disclosure_text?: string | null
          id?: string
          is_active?: boolean
          partner_name: string
          partner_network?: string | null
          product_id: string
          tracking_url: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          disclosure_text?: string | null
          id?: string
          is_active?: boolean
          partner_name?: string
          partner_network?: string | null
          product_id?: string
          tracking_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_account_applications: {
        Row: {
          billing_address: string | null
          bulk_requirements: string | null
          contact_person: string
          created_at: string
          delivery_address: string | null
          email: string
          estimated_monthly_spend: string | null
          id: string
          industry: string | null
          lead_id: string | null
          phone: string | null
          preferred_payment_method: string | null
          reference: string
          registered_name: string
          registration_number: string
          required_categories: string[]
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          trading_name: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          billing_address?: string | null
          bulk_requirements?: string | null
          contact_person: string
          created_at?: string
          delivery_address?: string | null
          email: string
          estimated_monthly_spend?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          reference?: string
          registered_name: string
          registration_number: string
          required_categories?: string[]
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          billing_address?: string | null
          bulk_requirements?: string | null
          contact_person?: string
          created_at?: string
          delivery_address?: string | null
          email?: string
          estimated_monthly_spend?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          reference?: string
          registered_name?: string
          registration_number?: string
          required_categories?: string[]
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_account_applications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      callback_requests: {
        Row: {
          consent: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          lead_id: string | null
          location: string | null
          phone: string
          preferred_time: string | null
          product_category: string | null
          reason: string
          reference: string
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lead_id?: string | null
          location?: string | null
          phone: string
          preferred_time?: string | null
          product_category?: string | null
          reason: string
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          phone?: string
          preferred_time?: string | null
          product_category?: string | null
          reason?: string
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "callback_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string
          handed_off: boolean
          id: string
          reference: string
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          visitor_token: string | null
        }
        Insert: {
          created_at?: string
          handed_off?: boolean
          id?: string
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          visitor_token?: string | null
        }
        Update: {
          created_at?: string
          handed_off?: boolean
          id?: string
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          visitor_token?: string | null
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "commerce_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_assets: {
        Row: {
          created_at: string
          download_limit: number | null
          file_name: string
          file_size_bytes: number | null
          id: string
          is_active: boolean
          licence_terms: string | null
          mime_type: string | null
          product_id: string
          storage_path: string
          updated_at: string
          variant_id: string | null
          version: string | null
        }
        Insert: {
          created_at?: string
          download_limit?: number | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          licence_terms?: string | null
          mime_type?: string | null
          product_id: string
          storage_path: string
          updated_at?: string
          variant_id?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string
          download_limit?: number | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          licence_terms?: string | null
          mime_type?: string | null
          product_id?: string
          storage_path?: string
          updated_at?: string
          variant_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_assets_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      human_support_requests: {
        Row: {
          channel: string
          context: string | null
          conversation_id: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          name: string | null
          phone: string | null
          reference: string
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
        }
        Insert: {
          channel?: string
          context?: string | null
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Update: {
          channel?: string
          context?: string | null
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          reference?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "human_support_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "human_support_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_source: string | null
          created_at: string
          details: Json
          email: string | null
          enquiry_type: Database["public"]["Enums"]["enquiry_type"]
          id: string
          interest: string | null
          location: string | null
          name: string
          phone: string | null
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          source_page: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          campaign_source?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          enquiry_type: Database["public"]["Enums"]["enquiry_type"]
          id?: string
          interest?: string | null
          location?: string | null
          name: string
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          campaign_source?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          enquiry_type?: Database["public"]["Enums"]["enquiry_type"]
          id?: string
          interest?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_group: string | null
          created_at: string
          display_order: number
          id: string
          is_filterable: boolean
          label: string
          product_id: string
          updated_at: string
          value: string
        }
        Insert: {
          attribute_group?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_filterable?: boolean
          label: string
          product_id: string
          updated_at?: string
          value: string
        }
        Update: {
          attribute_group?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_filterable?: boolean
          label?: string
          product_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          bundle_product_id: string
          component_product_id: string
          component_variant_id: string | null
          created_at: string
          display_order: number
          id: string
          is_optional: boolean
          quantity: number
          updated_at: string
        }
        Insert: {
          bundle_product_id: string
          component_product_id: string
          component_variant_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_optional?: boolean
          quantity?: number
          updated_at?: string
        }
        Update: {
          bundle_product_id?: string
          component_product_id?: string
          component_variant_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_optional?: boolean
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_bundles_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bundles_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bundles_component_variant_id_fkey"
            columns: ["component_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_fulfilment_options: {
        Row: {
          created_at: string
          delivery_areas: string | null
          delivery_estimate: string | null
          fulfilment_model: Database["public"]["Enums"]["sourcing_model"]
          handling_time_days: number | null
          id: string
          is_active: boolean
          is_default: boolean
          product_id: string
          shipping_cost: number | null
          supplier_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_areas?: string | null
          delivery_estimate?: string | null
          fulfilment_model: Database["public"]["Enums"]["sourcing_model"]
          handling_time_days?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          product_id: string
          shipping_cost?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_areas?: string | null
          delivery_estimate?: string | null
          fulfilment_model?: Database["public"]["Enums"]["sourcing_model"]
          handling_time_days?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          product_id?: string
          shipping_cost?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_fulfilment_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fulfilment_options_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fulfilment_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          product_id: string
          updated_at: string
          url: string
          variant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          product_id: string
          updated_at?: string
          url: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          product_id?: string
          updated_at?: string
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          is_active: boolean
          minimum_quantity: number
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          starts_at: string | null
          updated_at: string
          variant_id: string | null
          vat_inclusive: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id: string
          starts_at?: string | null
          updated_at?: string
          variant_id?: string | null
          vat_inclusive?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id?: string
          starts_at?: string | null
          updated_at?: string
          variant_id?: string | null
          vat_inclusive?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string
          height_cm: number | null
          id: string
          is_active: boolean
          is_default: boolean
          length_cm: number | null
          low_stock_threshold: number
          name: string
          options: Json
          product_id: string
          stock_quantity: number
          updated_at: string
          variant_sku: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          length_cm?: number | null
          low_stock_threshold?: number
          name: string
          options?: Json
          product_id: string
          stock_quantity?: number
          updated_at?: string
          variant_sku: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          length_cm?: number | null
          low_stock_threshold?: number
          name?: string
          options?: Json
          product_id?: string
          stock_quantity?: number
          updated_at?: string
          variant_sku?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          full_description: string | null
          id: string
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          published_at: string | null
          return_policy: string | null
          search_keywords: string[]
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string
          slug: string
          sourcing_model: Database["public"]["Enums"]["sourcing_model"]
          status: Database["public"]["Enums"]["catalogue_status"]
          tax_class: Database["public"]["Enums"]["tax_class"]
          updated_at: string
          visibility: Database["public"]["Enums"]["product_visibility"]
          warranty: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          full_description?: string | null
          id?: string
          name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          return_policy?: string | null
          search_keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku: string
          slug: string
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"]
          status?: Database["public"]["Enums"]["catalogue_status"]
          tax_class?: Database["public"]["Enums"]["tax_class"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["product_visibility"]
          warranty?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          full_description?: string | null
          id?: string
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          return_policy?: string | null
          search_keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string
          slug?: string
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"]
          status?: Database["public"]["Enums"]["catalogue_status"]
          tax_class?: Database["public"]["Enums"]["tax_class"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["product_visibility"]
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "commerce_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          additional_information: string | null
          budget: string | null
          company: string | null
          contact_name: string
          created_at: string
          email: string
          estimated_quantity: string | null
          id: string
          items: Json
          lead_id: string | null
          location: string | null
          phone: string
          reference: string
          required_date: string | null
          requirements: string
          scope: string
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
        }
        Insert: {
          additional_information?: string | null
          budget?: string | null
          company?: string | null
          contact_name: string
          created_at?: string
          email: string
          estimated_quantity?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          location?: string | null
          phone: string
          reference?: string
          required_date?: string | null
          requirements: string
          scope: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Update: {
          additional_information?: string | null
          budget?: string | null
          company?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          estimated_quantity?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          location?: string | null
          phone?: string
          reference?: string
          required_date?: string | null
          requirements?: string
          scope?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offerings: {
        Row: {
          base_price: number | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          pricing_model: Database["public"]["Enums"]["service_pricing_model"]
          product_id: string | null
          requirements: string | null
          service_areas: string[]
          slug: string
          status: Database["public"]["Enums"]["catalogue_status"]
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          pricing_model?: Database["public"]["Enums"]["service_pricing_model"]
          product_id?: string | null
          requirements?: string | null
          service_areas?: string[]
          slug: string
          status?: Database["public"]["Enums"]["catalogue_status"]
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          pricing_model?: Database["public"]["Enums"]["service_pricing_model"]
          product_id?: string | null
          requirements?: string | null
          service_areas?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["catalogue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offerings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "commerce_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_offerings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_applications: {
        Row: {
          brands_supplied: string | null
          catalogue_upload_available: boolean
          company_name: string
          contact_person: string
          created_at: string
          delivery_areas: string | null
          dropshipping_available: boolean
          email: string
          feed_capability: string | null
          id: string
          lead_id: string | null
          lead_times: string | null
          minimum_order: string | null
          phone: string | null
          product_categories: string[]
          reference: string
          registration_details: string | null
          source_page: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          website: string | null
          wholesale_available: boolean
        }
        Insert: {
          brands_supplied?: string | null
          catalogue_upload_available?: boolean
          company_name: string
          contact_person: string
          created_at?: string
          delivery_areas?: string | null
          dropshipping_available?: boolean
          email: string
          feed_capability?: string | null
          id?: string
          lead_id?: string | null
          lead_times?: string | null
          minimum_order?: string | null
          phone?: string | null
          product_categories?: string[]
          reference?: string
          registration_details?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          website?: string | null
          wholesale_available?: boolean
        }
        Update: {
          brands_supplied?: string | null
          catalogue_upload_available?: boolean
          company_name?: string
          contact_person?: string
          created_at?: string
          delivery_areas?: string | null
          dropshipping_available?: boolean
          email?: string
          feed_capability?: string | null
          id?: string
          lead_id?: string | null
          lead_times?: string | null
          minimum_order?: string | null
          phone?: string | null
          product_categories?: string[]
          reference?: string
          registration_details?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          website?: string | null
          wholesale_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "supplier_applications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_preferred: boolean
          minimum_order_quantity: number | null
          product_id: string
          supplier_cost: number | null
          supplier_id: string
          supplier_lead_time_days: number | null
          supplier_sku: string | null
          supplier_stock: number | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          minimum_order_quantity?: number | null
          product_id: string
          supplier_cost?: number | null
          supplier_id: string
          supplier_lead_time_days?: number | null
          supplier_sku?: string | null
          supplier_stock?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          minimum_order_quantity?: number | null
          product_id?: string
          supplier_cost?: number | null
          supplier_id?: string
          supplier_lead_time_days?: number | null
          supplier_sku?: string | null
          supplier_stock?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          application_id: string | null
          average_lead_time_days: number | null
          contact_person: string | null
          country: string
          created_at: string
          delivery_areas: string | null
          email: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          minimum_order: string | null
          name: string
          payment_terms: string | null
          phone: string | null
          reliability_rating: number | null
          slug: string
          supplier_type: Database["public"]["Enums"]["sourcing_model"]
          updated_at: string
          website: string | null
        }
        Insert: {
          application_id?: string | null
          average_lead_time_days?: number | null
          contact_person?: string | null
          country?: string
          created_at?: string
          delivery_areas?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          minimum_order?: string | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          reliability_rating?: number | null
          slug: string
          supplier_type?: Database["public"]["Enums"]["sourcing_model"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          application_id?: string | null
          average_lead_time_days?: number | null
          contact_person?: string | null
          country?: string
          created_at?: string
          delivery_areas?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          minimum_order?: string | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          reliability_rating?: number | null
          slug?: string
          supplier_type?: Database["public"]["Enums"]["sourcing_model"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "supplier_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chatbot_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_role: Database["public"]["Enums"]["chat_role"]
        }
        Returns: string
      }
      generate_reference: { Args: { p_prefix: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_public_product: { Args: { _product_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_lead: {
        Args: {
          p_campaign_source: string
          p_details: Json
          p_email: string
          p_enquiry_type: Database["public"]["Enums"]["enquiry_type"]
          p_interest: string
          p_location: string
          p_name: string
          p_phone: string
          p_preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          p_source_page: string
        }
        Returns: string
      }
      start_chatbot_conversation: {
        Args: { p_source_page?: string; p_visitor_token?: string }
        Returns: {
          id: string
          reference: string
        }[]
      }
      submit_business_account_application: {
        Args: {
          p_billing_address: string
          p_bulk_requirements: string
          p_campaign_source?: string
          p_contact_person: string
          p_delivery_address: string
          p_email: string
          p_estimated_monthly_spend: string
          p_industry: string
          p_phone: string
          p_preferred_payment_method: string
          p_registered_name: string
          p_registration_number: string
          p_required_categories: string[]
          p_source_page?: string
          p_trading_name: string
          p_vat_number: string
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
      submit_callback_request: {
        Args: {
          p_campaign_source?: string
          p_consent: boolean
          p_email: string
          p_full_name: string
          p_location: string
          p_phone: string
          p_preferred_time: string
          p_product_category: string
          p_reason: string
          p_source_page: string
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
      submit_human_support_request: {
        Args: {
          p_campaign_source?: string
          p_channel: string
          p_context: string
          p_conversation_id?: string
          p_email: string
          p_name: string
          p_phone: string
          p_source_page?: string
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
      submit_quote_request: {
        Args: {
          p_additional_information?: string
          p_budget?: string
          p_campaign_source?: string
          p_company: string
          p_contact_name: string
          p_email: string
          p_estimated_quantity?: string
          p_items?: Json
          p_location: string
          p_phone: string
          p_required_date?: string
          p_requirements: string
          p_scope: string
          p_source_page?: string
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
      submit_supplier_application: {
        Args: {
          p_brands_supplied: string
          p_campaign_source?: string
          p_catalogue_upload_available: boolean
          p_company_name: string
          p_contact_person: string
          p_delivery_areas: string
          p_dropshipping_available: boolean
          p_email: string
          p_feed_capability: string
          p_lead_times: string
          p_minimum_order: string
          p_phone: string
          p_product_categories: string[]
          p_registration_details: string
          p_source_page?: string
          p_website: string
          p_wholesale_available: boolean
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_type: "quote_only" | "fixed_booking" | "consultation"
      catalogue_status: "draft" | "active" | "archived"
      chat_role: "user" | "assistant" | "system"
      contact_method: "phone" | "whatsapp" | "email"
      enquiry_type:
        | "callback"
        | "quick_quote"
        | "product_sourcing"
        | "human_support"
        | "service_request"
        | "business_account"
        | "supplier_application"
        | "chatbot"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "closed"
      media_type: "image" | "video" | "document" | "model_3d"
      price_type: "cost" | "retail" | "business" | "promotional"
      product_type: "physical" | "digital" | "service" | "bundle" | "affiliate"
      product_visibility: "public" | "business_only" | "hidden"
      service_pricing_model:
        | "fixed"
        | "hourly"
        | "per_square_metre"
        | "per_visit"
        | "quote_based"
      sourcing_model:
        | "own_stock"
        | "local_supplier"
        | "local_dropshipping"
        | "international_dropshipping"
        | "print_on_demand"
        | "affiliate"
        | "digital"
        | "service"
      submission_status: "new" | "in_review" | "actioned" | "closed"
      tax_class: "standard" | "zero_rated" | "exempt"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      booking_type: ["quote_only", "fixed_booking", "consultation"],
      catalogue_status: ["draft", "active", "archived"],
      chat_role: ["user", "assistant", "system"],
      contact_method: ["phone", "whatsapp", "email"],
      enquiry_type: [
        "callback",
        "quick_quote",
        "product_sourcing",
        "human_support",
        "service_request",
        "business_account",
        "supplier_application",
        "chatbot",
      ],
      lead_status: ["new", "contacted", "qualified", "converted", "closed"],
      media_type: ["image", "video", "document", "model_3d"],
      price_type: ["cost", "retail", "business", "promotional"],
      product_type: ["physical", "digital", "service", "bundle", "affiliate"],
      product_visibility: ["public", "business_only", "hidden"],
      service_pricing_model: [
        "fixed",
        "hourly",
        "per_square_metre",
        "per_visit",
        "quote_based",
      ],
      sourcing_model: [
        "own_stock",
        "local_supplier",
        "local_dropshipping",
        "international_dropshipping",
        "print_on_demand",
        "affiliate",
        "digital",
        "service",
      ],
      submission_status: ["new", "in_review", "actioned", "closed"],
      tax_class: ["standard", "zero_rated", "exempt"],
    },
  },
} as const
