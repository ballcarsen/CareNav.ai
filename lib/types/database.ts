export type ProfileRole = "patient" | "family_member";
export type ConversationStatus = "in_progress" | "completed" | "failed";
export type ConversationTopic =
  | "general"
  | "medical_history"
  | "symptoms"
  | "medications"
  | "family_history";

export interface TranscriptTurn {
  role: string;
  message: string;
  secondsFromStart?: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          display_name: string | null;
          onboarded_at: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: ProfileRole;
          display_name?: string | null;
          onboarded_at?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: ProfileRole;
          display_name?: string | null;
          onboarded_at?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      topic_overrides: {
        Row: {
          topic: ConversationTopic;
          system_prompt: string | null;
          first_message: string | null;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          topic: ConversationTopic;
          system_prompt?: string | null;
          first_message?: string | null;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          topic?: ConversationTopic;
          system_prompt?: string | null;
          first_message?: string | null;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          vapi_call_id: string | null;
          status: ConversationStatus;
          topics: ConversationTopic[];
          started_at: string;
          ended_at: string | null;
          transcript: TranscriptTurn[] | null;
          summary: string | null;
          structured_data: Record<string, unknown> | null;
          ended_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vapi_call_id?: string | null;
          status?: ConversationStatus;
          topics?: ConversationTopic[];
          started_at?: string;
          ended_at?: string | null;
          transcript?: TranscriptTurn[] | null;
          summary?: string | null;
          structured_data?: Record<string, unknown> | null;
          ended_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vapi_call_id?: string | null;
          status?: ConversationStatus;
          topics?: ConversationTopic[];
          started_at?: string;
          ended_at?: string | null;
          transcript?: TranscriptTurn[] | null;
          summary?: string | null;
          structured_data?: Record<string, unknown> | null;
          ended_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
