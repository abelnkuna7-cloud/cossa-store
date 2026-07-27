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
      submission_status: "new" | "in_review" | "actioned" | "closed"
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
      submission_status: ["new", "in_review", "actioned", "closed"],
    },
  },
} as const
