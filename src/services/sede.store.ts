// Sobre que local se esta trabajando.
//
// Una cadena administra varios locales con un solo login: el analista entra una
// vez y cambia de sede desde un combo. Antes habia que salir y volver a entrar
// con el usuario de cada local.
//
// SE GUARDA EN localStorage a proposito. Programar los horarios de un local son
// varias pantallas -- personal, calendario, configuracion -- y perder la sede
// elegida al navegar significa volver a elegirla en cada una, o peor, creer que
// se esta editando un local y estar editando otro.
//
// La empresa NO se elige nunca: sale del token y el servidor la verifica. Este
// valor es una comodidad del navegador, no un permiso: mandar una sede ajena
// devuelve 403 aunque se edite el localStorage a mano.

import { writable } from 'svelte/store';

const CLAVE = 'sys::asis_idsede';

function leer(): number {
    try {
        const v = Number(localStorage.getItem(CLAVE));
        return Number.isFinite(v) && v > 0 ? v : 0;
    } catch (e) {
        // Modo privado o cuota llena: se trabaja sobre la sede del login
        return 0;
    }
}

/** 0 = la sede del login. Cualquier otro numero, una sede elegida. */
export const sedeActiva = writable<number>(0);

/** Nombre de la sede elegida, solo para mostrarlo. */
export const sedeNombre = writable<string>('');

export function iniciarSede() {
    sedeActiva.set(leer());
}

export function elegirSede(idsede: number, nombre = '') {
    sedeActiva.set(idsede || 0);
    sedeNombre.set(nombre);
    try {
        if (idsede) { localStorage.setItem(CLAVE, String(idsede)); }
        else { localStorage.removeItem(CLAVE); }
    } catch (e) { /* ver arriba */ }
}

/**
 * La sede que hay que mandar en la proxima llamada.
 *
 * Se lee del localStorage y no del store para que funcione tambien desde el
 * cliente HTTP, que no vive dentro de un componente y no puede suscribirse.
 */
export const sedeParaPedido = (): number => leer();
