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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      actividad: {
        Row: {
          accion: string
          actor_nombre: string
          categoria: string
          created_at: string
          descripcion: string
          detalle: Json
          id: number
          institucion_id: string
          persona_id: string | null
          transaccion: number
        }
        Insert: {
          accion: string
          actor_nombre: string
          categoria: string
          created_at?: string
          descripcion: string
          detalle?: Json
          id?: never
          institucion_id: string
          persona_id?: string | null
          transaccion?: number
        }
        Update: {
          accion?: string
          actor_nombre?: string
          categoria?: string
          created_at?: string
          descripcion?: string
          detalle?: Json
          id?: never
          institucion_id?: string
          persona_id?: string | null
          transaccion?: number
        }
        Relationships: [
          {
            foreignKeyName: "actividad_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      aceptaciones_legales: {
        Row: {
          aceptado_en: string
          documento_id: string
          persona_id: string
        }
        Insert: {
          aceptado_en?: string
          documento_id: string
          persona_id: string
        }
        Update: {
          aceptado_en?: string
          documento_id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aceptaciones_legales_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_legales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aceptaciones_legales_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      acudiente_estudiante: {
        Row: {
          created_at: string
          estudiante_id: string
          id: string
          persona_id: string
        }
        Insert: {
          created_at?: string
          estudiante_id: string
          id?: string
          persona_id: string
        }
        Update: {
          created_at?: string
          estudiante_id?: string
          id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acudiente_estudiante_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acudiente_estudiante_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_legales: {
        Row: {
          contenido: string
          id: string
          publicado_en: string
          publicado_por: string | null
          requiere_aceptacion: boolean
          resumen_cambios: string | null
          tipo: string
          version: number
        }
        Insert: {
          contenido: string
          id?: string
          publicado_en?: string
          publicado_por?: string | null
          requiere_aceptacion?: boolean
          resumen_cambios?: string | null
          tipo: string
          version: number
        }
        Update: {
          contenido?: string
          id?: string
          publicado_en?: string
          publicado_por?: string | null
          requiere_aceptacion?: boolean
          resumen_cambios?: string | null
          tipo?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_legales_publicado_por_fkey"
            columns: ["publicado_por"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      estudiantes: {
        Row: {
          apellidos: string
          codigo_institucional: string
          created_at: string
          curso_grado: string
          fecha_nacimiento: string
          id: string
          institucion_id: string
          nombres: string
          numero_documento: string
        }
        Insert: {
          apellidos: string
          codigo_institucional: string
          created_at?: string
          curso_grado: string
          fecha_nacimiento: string
          id?: string
          institucion_id: string
          nombres: string
          numero_documento: string
        }
        Update: {
          apellidos?: string
          codigo_institucional?: string
          created_at?: string
          curso_grado?: string
          fecha_nacimiento?: string
          id?: string
          institucion_id?: string
          nombres?: string
          numero_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_grupos: {
        Row: {
          created_at: string
          curso_grado: string | null
          estudiante_id: string | null
          evento_id: string
          id: string
        }
        Insert: {
          created_at?: string
          curso_grado?: string | null
          estudiante_id?: string | null
          evento_id: string
          id?: string
        }
        Update: {
          created_at?: string
          curso_grado?: string | null
          estudiante_id?: string | null
          evento_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_grupos_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_grupos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          creado_por: string | null
          created_at: string
          descripcion: string | null
          fecha_evento: string | null
          fecha_limite_pago: string | null
          finalizado_en: string | null
          id: string
          imagen_url: string | null
          institucion_id: string
          nombre: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_evento?: string | null
          fecha_limite_pago?: string | null
          finalizado_en?: string | null
          id?: string
          imagen_url?: string | null
          institucion_id: string
          nombre: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_evento?: string | null
          fecha_limite_pago?: string | null
          finalizado_en?: string | null
          id?: string
          imagen_url?: string | null
          institucion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "membresias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      grados: {
        Row: {
          created_at: string
          id: string
          institucion_id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          institucion_id: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          institucion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "grados_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_curso_grados: {
        Row: {
          created_at: string
          grado_id: string
          grupo_curso_id: string
          id: string
        }
        Insert: {
          created_at?: string
          grado_id: string
          grupo_curso_id: string
          id?: string
        }
        Update: {
          created_at?: string
          grado_id?: string
          grupo_curso_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_curso_grados_grado_id_fkey"
            columns: ["grado_id"]
            isOneToOne: false
            referencedRelation: "grados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_curso_grados_grupo_curso_id_fkey"
            columns: ["grupo_curso_id"]
            isOneToOne: false
            referencedRelation: "grupos_curso"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_curso: {
        Row: {
          created_at: string
          id: string
          institucion_id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          institucion_id: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          institucion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_curso_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      instituciones: {
        Row: {
          created_at: string
          estado: string
          fondo: string
          id: string
          nombre: string
          paleta: string
          plan: string | null
          prefijo_codigo: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fondo?: string
          id?: string
          nombre: string
          paleta?: string
          plan?: string | null
          prefijo_codigo: string
        }
        Update: {
          created_at?: string
          estado?: string
          fondo?: string
          id?: string
          nombre?: string
          paleta?: string
          plan?: string | null
          prefijo_codigo?: string
        }
        Relationships: []
      }
      membresias: {
        Row: {
          codigo: string | null
          correo_invitacion: string | null
          created_at: string
          id: string
          institucion_id: string | null
          persona_id: string
          rol: string
        }
        Insert: {
          codigo?: string | null
          correo_invitacion?: string | null
          created_at?: string
          id?: string
          institucion_id?: string | null
          persona_id: string
          rol: string
        }
        Update: {
          codigo?: string | null
          correo_invitacion?: string | null
          created_at?: string
          id?: string
          institucion_id?: string | null
          persona_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "membresias_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membresias_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          apellidos: string | null
          correo: string | null
          created_at: string
          id: string
          nombres: string | null
          telefono: string | null
        }
        Insert: {
          apellidos?: string | null
          correo?: string | null
          created_at?: string
          id: string
          nombres?: string | null
          telefono?: string | null
        }
        Update: {
          apellidos?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          nombres?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      productos: {
        Row: {
          cantidad_maxima_por_estudiante: number | null
          created_at: string
          evento_id: string
          id: string
          nombre: string
          precio_unitario: number
          tipo: string
        }
        Insert: {
          cantidad_maxima_por_estudiante?: number | null
          created_at?: string
          evento_id: string
          id?: string
          nombre: string
          precio_unitario: number
          tipo: string
        }
        Update: {
          cantidad_maxima_por_estudiante?: number | null
          created_at?: string
          evento_id?: string
          id?: string
          nombre?: string
          precio_unitario?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_pago: {
        Row: {
          cantidad: number
          comprobante: string | null
          devuelta_pendiente: boolean
          dinero_recibido: number | null
          estudiante_id: string
          evento_id: string
          grupo_pago_id: string
          id: string
          metodo: string
          monto: number
          pagado_en: string
          producto_id: string | null
          registrado_por: string | null
        }
        Insert: {
          cantidad?: number
          comprobante?: string | null
          devuelta_pendiente?: boolean
          dinero_recibido?: number | null
          estudiante_id: string
          evento_id: string
          grupo_pago_id?: string
          id?: string
          metodo: string
          monto: number
          pagado_en?: string
          producto_id?: string | null
          registrado_por?: string | null
        }
        Update: {
          cantidad?: number
          comprobante?: string | null
          devuelta_pendiente?: boolean
          dinero_recibido?: number | null
          estudiante_id?: string
          evento_id?: string
          grupo_pago_id?: string
          id?: string
          metodo?: string
          monto?: number
          pagado_en?: string
          producto_id?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pago_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pago_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pago_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pago_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "membresias"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculo_intentos: {
        Row: {
          creado_en: string
          id: number
          persona_id: string
        }
        Insert: {
          creado_en?: string
          id?: never
          persona_id: string
        }
        Update: {
          creado_en?: string
          id?: never
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculo_intentos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_documentos_legales: {
        Args: { p_tipos: string[] }
        Returns: undefined
      }
      aceptar_invitacion: {
        Args: { p_membresia_id: string }
        Returns: string
      }
      actividad_anotar: {
        Args: {
          p_accion: string
          p_categoria: string
          p_descripcion: string
          p_detalle?: Json
          p_institucion_id: string
        }
        Returns: undefined
      }
      actividad_nombre_estudiante: {
        Args: { p_estudiante_id: string }
        Returns: string
      }
      actividad_nombre_persona: {
        Args: { p_persona_id: string }
        Returns: string
      }
      actividad_pesos: { Args: { p_valor: number }; Returns: string }
      actualizar_apariencia_institucion: {
        Args: { p_fondo: string; p_institucion_id: string; p_paleta: string }
        Returns: undefined
      }
      buscar_persona_id_por_correo: {
        Args: { p_correo: string }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      documento_estudiante: {
        Args: { p_estudiante_id: string }
        Returns: string
      }
      documentos_de_institucion: {
        Args: { p_institucion_id: string }
        Returns: {
          id: string
          numero_documento: string
        }[]
      }
      es_acudiente_de: { Args: { p_estudiante_id: string }; Returns: boolean }
      es_personal_de: {
        Args: { p_institucion_id: string; p_roles: string[] }
        Returns: boolean
      }
      es_super_admin: { Args: never; Returns: boolean }
      estado_legal: {
        Args: never
        Returns: {
          avisar: boolean
          bloquea: boolean
          documento_id: string
          publicado_en: string
          resumen_cambios: string | null
          tipo: string
          version: number
        }[]
      }
      evento_acepta_pagos: { Args: { p_evento_id: string }; Returns: boolean }
      evento_finalizado: {
        Args: { p_fecha_evento: string; p_finalizado_en: string }
        Returns: boolean
      }
      evento_visible_para_acudiente: {
        Args: { p_evento_id: string }
        Returns: boolean
      }
      hoy_colombia: { Args: never; Returns: string }
      institucion_esta_activa: {
        Args: { p_institucion_id: string }
        Returns: boolean
      }
      jwt_membresias: { Args: never; Returns: Json }
      marcar_devuelta_entregada: {
        Args: { p_grupo_pago_id: string }
        Returns: undefined
      }
      publicar_documento_legal: {
        Args: {
          p_contenido: string
          p_requiere_aceptacion: boolean
          p_resumen: string
          p_tipo: string
        }
        Returns: number
      }
      puede_gestionar_imagen_evento: {
        Args: { p_nombre: string }
        Returns: boolean
      }
      rechazar_invitacion: {
        Args: { p_membresia_id: string }
        Returns: undefined
      }
      registrar_pagos_efectivo: {
        Args: { p_evento_id: string; p_filas: Json; p_producto_id: string }
        Returns: Json
      }
      tiene_rol_en_institucion: {
        Args: { p_institucion_id: string; p_roles: string[] }
        Returns: boolean
      }
      vincular_estudiante: {
        Args: {
          p_codigo: string
          p_fecha_nacimiento: string
          p_institucion_id: string
          p_numero_documento: string
        }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
