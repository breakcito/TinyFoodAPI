/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { AuthSocket } from './interfaces/auth-socket.interface';
import { AuthData } from '../../modules/auth/data/auth.data';
import { ClientRequest } from './dtos/client.request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthSocket>();
    const data = context.switchToWs().getData<ClientRequest>();

    const token: string | undefined =
      data?.token || (client.handshake?.auth?.token as string);
    if (!token) throw new WsException('No se proporcionó token');

    try {
      const user = await AuthGuard.verify(token, this.configService);
      client.user = user;

      // Buscamos en nuestra base de datos local usando el ID de Supabase
      const usuario = await AuthData.findUserBySupabaseId(user.id);

      // Si no existe en la BD y no es un evento de inicio (autenticar/registrar), bloqueamos
      const isAuthEvent =
        data?.event === 'auth:autenticar' || data?.event === 'auth:registrar';
      if (!usuario && !isAuthEvent) {
        throw new WsException('Usuario no registrado localmente');
      }

      // Adjuntamos el usuario de la BD al socket
      client.usuario = usuario as any;

      return true;
    } catch (e) {
      if (e instanceof WsException) throw e;
      throw new WsException('Token inválido o sesión expirada');
    }
  }

  /** Lógica de verificación estática para reutilización */
  static async verify(token: string, configService: ConfigService) {
    try {
      const supabaseUrl = configService.get<string>('SUPABASE_URL');
      const supabaseKey = configService.get<string>('SUPABASE_KEY');

      const supabase = createClient(supabaseUrl!, supabaseKey!);
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        console.error(
          `[AuthGuard] Error verificando token con Supabase:`,
          error?.message,
        );
        throw new Error('Inválido');
      }

      // console.log(
      //   `[AuthGuard] Token verificado con Supabase para user: ${data.user.id}`,
      // );
      return data.user;
    } catch (error: any) {
      console.error(
        `[AuthGuard] Fallo crítico en verificación de token: ${error.message}`,
      );
      throw new WsException('Token inválido');
    }
  }
}
