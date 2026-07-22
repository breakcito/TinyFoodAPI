import { ComidaData } from '../data/comida.data';
import { UserData } from '../../usuario/data/usuario.data';

const NIVELES_ACTIVIDAD: Record<number, string> = {
  1: 'sedentario (poco o ningún ejercicio)',
  2: 'ligeramente activo (ejercicio 1-3 días/semana)',
  3: 'moderadamente activo (ejercicio 3-5 días/semana)',
  4: 'muy activo (ejercicio 6-7 días/semana)',
  5: 'extremadamente activo (trabajo físico intenso o atleta)',
};

export interface IAContext {
  contextoUsuario: string;
  restricciones: string[];
  comidas: {
    todas: Awaited<ReturnType<typeof ComidaData.findAllByUserId>>;
    disponibles: Awaited<ReturnType<typeof ComidaData.findAllByUserId>>;
    ordenadas: Awaited<
      ReturnType<typeof ComidaData.findAvailableOrderByVencimiento>
    >;
  };
}

// Reúne el perfil completo del usuario y su despensa
// y los devuelve listos para inyectar en cualquier prompt de IA.
export class UC_BuildIAContext {
  static async execute(id_usuario: number): Promise<IAContext> {
    const [todasLasComidas, alimentosOrdenados, usuario] = await Promise.all([
      ComidaData.findAllByUserId(id_usuario),
      ComidaData.findAvailableOrderByVencimiento(id_usuario, 15),
      UserData.findById(id_usuario),
    ]);

    const disponibles = todasLasComidas.filter(
      (c) => c.estado === 'Por consumir',
    );

    // --- Restricciones absolutas ---
    const restricciones: string[] = [];
    if (usuario?.alimentos_prohibidos?.length) {
      restricciones.push(
        `NUNCA uses estos ingredientes (alergias/prohibidos): ${usuario.alimentos_prohibidos.join(', ')}`,
      );
    }

    // --- Edad calculada ---
    const edad = usuario?.fecha_nacimiento
      ? Math.floor(
          (Date.now() - new Date(usuario.fecha_nacimiento).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

    // --- Nivel de actividad en texto ---
    const nivelActividad = usuario?.nivel_actividad
      ? (NIVELES_ACTIVIDAD[usuario.nivel_actividad] ?? null)
      : null;

    // --- Información médica ---
    const infoMedica = (() => {
      if (!usuario?.informacion_medica) return null;
      try {
        const lista = (
          typeof usuario.informacion_medica === 'string'
            ? JSON.parse(usuario.informacion_medica)
            : usuario.informacion_medica
        ) as { nombre: string; descripcion: string }[];
        if (!lista?.length) return null;
        return `Condiciones médicas: ${lista.map((m) => `${m.nombre} (${m.descripcion})`).join(', ')}`;
      } catch {
        return null;
      }
    })();

    // --- Configuración de cocina ---
    const configPreferencias = (() => {
      if (!usuario?.configuracion) return null;
      try {
        const config = (
          typeof usuario.configuracion === 'string'
            ? JSON.parse(usuario.configuracion)
            : usuario.configuracion
        ) as {
          dificultad?: string;
          estilosComida?: string[];
          equipamiento?: string[];
        } | null;

        if (!config) return null;

        const dificultad =
          config.dificultad === 'rapido'
            ? 'Prefiere recetas rápidas/express (dificultad fácil, ≤ 30 min).'
            : 'Puede preparar recetas de cualquier dificultad y tiempo.';

        const estilos = config.estilosComida?.length
          ? `Estilos gastronómicos y cocina preferida: ${config.estilosComida.join(', ')}. Inspírate en comidas caseras, populares y cotidianas de estas tradiciones gastronómicas (ej. si incluye Peruana: locro, arroz a la cubana, menestras, tortilla de verduras; si incluye China: chifa, arroz chaufa, tallarín saltado, etc.).`
          : 'Estilos de cocina: Comida casera, familiar, variada y cotidiana del día a día.';

        const equipamiento = config.equipamiento?.length
          ? `Equipamiento disponible: ${config.equipamiento.join(', ')}`
          : null;

        return [dificultad, estilos, equipamiento].filter(Boolean).join('\n');
      } catch {
        return null;
      }
    })();

    // --- Contexto final listo para el prompt ---
    const contextoUsuario = [
      edad ? `Edad: ${edad} años` : null,
      usuario?.genero ? `Género: ${usuario.genero}` : null,
      usuario?.peso ? `Peso: ${String(usuario.peso)} kg` : null,
      usuario?.talla ? `Talla: ${String(usuario.talla)} cm` : null,
      nivelActividad ? `Nivel de actividad: ${nivelActividad}` : null,
      infoMedica,
      usuario?.objetivo_fisico
        ? `Objetivo físico: ${usuario.objetivo_fisico}`
        : null,
      usuario?.preferencias?.length
        ? `Preferencias: ${usuario.preferencias.join(', ')}`
        : null,
      configPreferencias,
      ...restricciones,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      contextoUsuario,
      restricciones,
      comidas: {
        todas: todasLasComidas,
        disponibles,
        ordenadas: alimentosOrdenados,
      },
    };
  }
}
