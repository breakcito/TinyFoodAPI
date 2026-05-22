# TinyFood API

> **Para IA del IDE:** Lee este documento completo antes de generar o sugerir cualquier código. Contiene las reglas, arquitectura, modelos de datos y convenciones estrictas de este proyecto.

## 1. Contexto del Negocio

**Objetivo:** Backend de alto rendimiento para la app móvil TinyFood. Gestiona el ciclo de vida de los alimentos y la salud del usuario mediante IA.

**Flujo principal:**

1. El cliente móvil conecta vía WebSocket.
2. Se autentica mediante el JWT de Supabase (validado en el `AuthGuard`).
3. Envía eventos (`auth:autenticar`, `despensa:analyze_image`, etc.).
4. La API procesa, persiste en PostgreSQL (Supabase) y responde mediante un callback (Acknowledgement).

---

## 2. Stack Tecnológico

| Herramienta        | Versión | Uso                                       |
| ------------------ | ------- | ----------------------------------------- |
| NestJS             | ^11.0.1 | Framework principal                       |
| TypeScript         | ^5.7.3  | Tipado estricto obligatorio               |
| Socket.IO          | ^4.8.3  | Motor de comunicación bidireccional       |
| Prisma ORM         | ^6.4.1  | Gestión de Base de Datos (PostgreSQL)     |
| @supabase/supabase | ^2.62.2 | Validación de sesiones y acceso a storage |
| @google/genai      | ^1.49.0 | Integración con IA Gemini 2.0             |

---

## 3. Arquitectura de Comunicación (WebSockets Core)

Hemos implementado un sistema de **Puente Centralizado** para máxima seguridad y orden:

### 3.1 `PrivateGateway` (`src/common/presentation/gateways`)

Es el único punto de entrada para eventos privados.

- Usa un listener `onAny` para capturar todos los eventos.
- Valida manualmente el token JWT mediante `AuthGuard.verify`.
- Inyecta el `usuario` de la base de datos directamente en el objeto `client`.
- Soporta **Acknowledgements** (callbacks): si el cliente envía una función de respuesta, la API la ejecuta.

### 3.2 `Dispatcher` (`src/common/presentation/dispatcher.ts`)

Actúa como el "router" de los eventos WebSocket.

- Registra handlers de forma estática.
- Busca el handler correspondiente al nombre del evento (ej: `auth:autenticar`) y lo ejecuta.

---

## 4. Arquitectura y Estructura de Carpetas

El backend está diseñado bajo principios de **Clean Architecture** y **Modularidad**, permitiendo desacoplar la infraestructura de la lógica de negocio.

### 4.1 Estructura Principal (`src/`)

- `common/`: **Infraestructura y Lógica Compartida**.
  - `presentation/`:
    - `gateways/`: Puentes WebSocket (`PrivateGateway`, `PublicGateway`). Centralizan la entrada de eventos.
    - `dispatcher.ts`: El cerebro que enruta los eventos WebSocket a su handler correspondiente.
    - `auth.guard.ts`: Validador de tokens JWT de Supabase.
    - `dtos/`: Clases para validación de payloads entrantes.
  - `logic/`: Interfaces globales, excepciones personalizadas y decoradores.
- `modules/`: **Dominios del Negocio (Features)**.
  - `presentation/`: Registro de eventos en el Dispatcher. Aquí se definen qué eventos escucha el módulo (ej. `auth.gateway.ts`).
  - `logic/`: **Casos de Uso (UC)**. Contienen la lógica pura de negocio. No conocen nada de WebSockets ni de la base de datos directamente (usan interfaces).
  - `data/`: Implementación de repositorios usando **Prisma**. Es la única capa que habla con la base de datos.
- `app.module.ts`: Punto de anclaje donde se registran todos los módulos de NestJS.
- `main.ts`: Configuración global (CORS, Pipes, Shutdown Hooks, Listeners).

### 4.2 Flujo de una Petición (Event Flow)

```
[Cliente Móvil]
  → Socket Emit ('modulo:evento')
    → PrivateGateway (Middleware: AuthGuard)
      → Dispatcher (Busca el handler)
        → Module Gateway ( presentation/ )
          → Use Case ( logic/ )
            → Repository ( data/ )
              → Prisma ( Database )
```

### 4.3 Base de Datos (Prisma)

- `prisma/schema/`: Utilizamos el **esquema multi-archivo** para evitar un archivo `schema.prisma` gigante e inmanejable. Cada dominio tiene su propio `.prisma`.
- **Convención:** No se exportan modelos de Prisma directamente a la capa de lógica; se mapean o se usan interfaces para evitar el acoplamiento fuerte al ORM.

---

## 5. Base de Datos (Prisma & Supabase)

### 5.1 Esquema Multi-archivo

Usamos `prisma/schema/*.prisma` para mantener el orden. Los modelos principales son:

- **Usuario:** Almacena peso, talla, y arreglos nativos de Postgres (`String[]`) para `alimentos_prohibidos` y `preferencias`.
- **Comida:** Almacena el inventario con fechas de vencimiento estimadas.

### 5.2 Tipos de Datos Especiales

- **Arrays:** Usamos `String[]` para tags y preferencias (mapeados a `text[]` en Postgres).
- **JSONB:** Usamos `Json?` para `informacion_medica`, permitiendo estructuras flexibles.

---

## 6. Seguridad (AuthGuard)

El `AuthGuard.ts` utiliza el SDK oficial de Supabase para verificar los tokens:

1. Recibe el token del payload o del handshake.
2. Llama a `supabase.auth.getUser(token)`.
3. Si el usuario existe en Supabase pero no en nuestra BD local, permite el evento `auth:registrar` pero bloquea los demás.

---

## 7. Convenciones de Respuesta (`ApiResponse`)

Todas las respuestas deben seguir esta estructura:

```typescript
{
  success: boolean;
  data: any | null;
  message: string | null;
}
```

---

## 8. Scripts de Desarrollo

- `npx skills install`: Instalar SKILLS de IA.
- `npm run start:dev`: Inicia la API en modo watch.
  - **Host:** Escucha en `0.0.0.0` para permitir que dispositivos móviles en la misma red local (como tu propio celular) puedan alcanzar la API.
  - **Puerto:** `3000`.
- `npx prisma generate`: Genera el cliente de Prisma tras cambios en el schema.
- `npx prisma db push`: Sincroniza el schema con Supabase.

---

## 9. Configuración de Red Local

Para que la app móvil (ejecutándose en un celular físico o emulador) pueda comunicarse con esta API ejecutándose en la misma PC:

1. **Host 0.0.0.0:** La API está configurada para escuchar en todas las interfaces de red.
2. **Puerto:** Asegúrate de que el puerto `3000` esté permitido en el Firewall de tu sistema operativo.
3. **Conexión:** El dispositivo móvil debe estar en la misma red Wi-Fi que la PC.

> [!NOTE]
> Cada desarrollador que clone este proyecto debe usar la IP privada de su propia máquina en la configuración del Frontend para establecer la conexión del Socket.

---

## 10. Variables de Entorno (.env)

```env
PORT=3000
SUPABASE_URL=...
SUPABASE_KEY=... # Publishable key
SUPABASE_SERVICE_ROLE_KEY=... # Para bypass de RLS
DATABASE_URL=... # URL de conexión directa o pooler
GEMINI_API_KEY=...
```
