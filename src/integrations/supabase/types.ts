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
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          phone: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          phone: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          phone?: string
          username?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_numbers: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          reason?: string | null
        }
        Relationships: []
      }
      broadcast_contacts: {
        Row: {
          created_at: string
          id: string
          phone_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          phone_number: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          phone_number: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          phone_number?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_type?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          mpesa_code: string
          package_name: string | null
          phone_number: string
          status: string
          transaction_id: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          mpesa_code: string
          package_name?: string | null
          phone_number: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          mpesa_code?: string
          package_name?: string | null
          phone_number?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          data_amount: string | null
          description: string | null
          id: string
          is_promo: boolean
          is_visible: boolean
          minutes: string | null
          name: string
          network: string | null
          price: number
          sort_order: number
          units: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          data_amount?: string | null
          description?: string | null
          id?: string
          is_promo?: boolean
          is_visible?: boolean
          minutes?: string | null
          name: string
          network?: string | null
          price: number
          sort_order?: number
          units?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          data_amount?: string | null
          description?: string | null
          id?: string
          is_promo?: boolean
          is_visible?: boolean
          minutes?: string | null
          name?: string
          network?: string | null
          price?: number
          sort_order?: number
          units?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          message: string
          phone_number: string
          retry_count: number
          status: string
          transaction_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          message: string
          phone_number: string
          retry_count?: number
          status?: string
          transaction_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          message?: string
          phone_number?: string
          retry_count?: number
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      stk_rate_limits: {
        Row: {
          attempted_at: string
          id: string
          phone_number: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          phone_number: string
        }
        Update: {
          attempted_at?: string
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          failure_reason: string | null
          id: string
          kplc_token: string | null
          meter_number: string | null
          mpesa_reference: string | null
          network: string | null
          order_number: number
          package_name: string
          phone_number: string
          product_id: string | null
          referral_code: string | null
          service_number: string | null
          status: string
          stk_checkout_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          kplc_token?: string | null
          meter_number?: string | null
          mpesa_reference?: string | null
          network?: string | null
          order_number?: number
          package_name: string
          phone_number: string
          product_id?: string | null
          referral_code?: string | null
          service_number?: string | null
          status?: string
          stk_checkout_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          kplc_token?: string | null
          meter_number?: string | null
          mpesa_reference?: string | null
          network?: string | null
          order_number?: number
          package_name?: string
          phone_number?: string
          product_id?: string | null
          referral_code?: string | null
          service_number?: string | null
          status?: string
          stk_checkout_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          approved_at: string | null
          commission_balance: number
          commission_rate: number
          created_at: string
          id: string
          mpesa_payout: string
          name: string
          password_hash: string
          phone: string
          referral_code: string
          status: string
          total_revenue: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          commission_balance?: number
          commission_rate?: number
          created_at?: string
          id?: string
          mpesa_payout: string
          name: string
          password_hash: string
          phone: string
          referral_code?: string
          status?: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          commission_balance?: number
          commission_rate?: number
          created_at?: string
          id?: string
          mpesa_payout?: string
          name?: string
          password_hash?: string
          phone?: string
          referral_code?: string
          status?: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          mpesa_reference: string | null
          phone: string
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          mpesa_reference?: string | null
          phone: string
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          mpesa_reference?: string | null
          phone?: string
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_stk_rate_limit: { Args: { p_phone: string }; Returns: boolean }
      hash_password: { Args: { p_password: string }; Returns: string }
      is_banned: { Args: { p_phone: string }; Returns: boolean }
      vendor_login_status: {
        Args: { p_password: string; p_phone: string }
        Returns: {
          vendor_id: string
          vendor_name: string
          vendor_referral_code: string
          vendor_status: string
        }[]
      }
      verify_admin: {
        Args: { p_password: string; p_username: string }
        Returns: {
          admin_id: string
          session_token: string
        }[]
      }
      verify_admin_session: { Args: { p_token: string }; Returns: string }
      verify_vendor: {
        Args: { p_password: string; p_phone: string }
        Returns: {
          vendor_id: string
          vendor_name: string
          vendor_referral_code: string
          vendor_status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
