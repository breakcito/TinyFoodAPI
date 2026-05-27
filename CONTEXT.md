TinyFood API

Para IA del IDE: Lee este documento completo antes de generar o sugerir cualquier código. Contiene las reglas, arquitectura, modelos de datos y convenciones estrictas de este proyecto.

1. Contexto del Negocio
Objetivo: Backend de alto rendimiento para la app móvil TinyFood. Gestiona el ciclo de vida de los alimentos y la salud del usuario mediante IA.

Flujo Principal:
1. El cliente móvil conecta vía WebSocket.
2. Se autentica mediante el JWT de Supabase (validado en el AuthGuard).
3. Envía eventos (auth:autenticar, despensa:analyze_image, etc.).
4. La API procesa, persiste en PostgreSQL (Supabase) y responde mediante un callback (Acknowledgement).

2. Stack Tecnológico
- NestJS: Framework principal
- TypeScript: Tipado estricto obligatorio
- Socket.IO: Motor de comunicación bidireccional
- Prisma ORM: Gestión de Base de Datos (PostgreSQL)
- Supabase: Validación de sesiones y acceso a storage
- Google GenAI: Integración con IA Gemini 2.0

3. Arquitectura de Comunicación (WebSockets Core)
Hemos implementado un sistema de Puente Centralizado para máxima seguridad y orden:

PrivateGateway (src/common/presentation/gateways)
Es el único punto de entrada para eventos privados. Usa un listener onAny para capturar todos los eventos, valida manualmente el token JWT mediante AuthGuard.verify, e inyecta el usuario en el cliente. Soporta Acknowledgements.

Dispatcher (src/common/presentation/dispatcher.ts)
Actúa como el "router" de los eventos WebSocket. Registra handlers de forma estática y ejecuta el correspondiente al evento.

4. Arquitectura y Estructura de Carpetas
El backend está diseñado bajo principios de Clean Architecture y Modularidad.

Estructura Principal (src/)
- common/: Infraestructura y Lógica Compartida.
  - presentation/: gateways, dispatcher, auth.guard, dtos.
  - logic/: Interfaces, excepciones.
- modules/: Dominios del Negocio (Features).
  - presentation/: Registro de eventos en el Dispatcher.
  - logic/: Casos de Uso (UC). Contienen la lógica pura de negocio.
  - data/: Implementación de repositorios usando Prisma. Única capa que habla con BD.
- app.module.ts: Punto de anclaje.
- main.ts: Configuración global.

Flujo de una Petición (Event Flow)
Cliente -> PrivateGateway -> Dispatcher -> Module Gateway -> Use Case -> Repository -> Prisma

5. Base de Datos (Prisma & Supabase)
Esquema Multi-archivo: prisma/schema/*.prisma.
Modelos: Usuario, Comida.
Tipos Especiales: String[] (arrays en Postgres) y Json (informacion_medica).

6. Seguridad y Autenticación
AuthGuard utiliza el SDK de Supabase para verificar tokens (supabase.auth.getUser). Si el usuario no existe en la BD local, solo permite auth:registrar.

7. Convenciones de Respuesta (ApiResponse)
{
  success: boolean;
  data: any | null;
  message: string | null;
}

8. Configuración de Red Local
- Host 0.0.0.0
- Puerto 3000

9. Variables de Entorno (.env)
- PORT=3000
- SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- GEMINI_API_KEY

10. Comandos y Ejecución
- npm install
- npm run start:dev
- npx prisma generate
