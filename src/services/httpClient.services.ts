import { PUBLIC_API_KEY } from '$env/static/public'
import { sedeParaPedido } from './sede.store'

/**
 * Arma la URL agregando la sede elegida cuando corresponde.
 *
 * Solo para `asistencia-rrhh`: es el unico modulo que trabaja sobre varios
 * locales. El servidor igual verifica que la sede sea de la empresa del token,
 * asi que esto es comodidad, no permiso.
 */
const armarUrl = (controller: string, event: string) => {
    const base = `${PUBLIC_API_KEY}/${controller}/${event}`
    if (controller !== 'asistencia-rrhh') { return base }

    const idsede = sedeParaPedido()
    if (!idsede) { return base }

    return base + (base.includes('?') ? '&' : '?') + 'idsede=' + idsede
}


// export function get apirest
export const getData = async (controller: string, event: string, payload: any = null) => {
    const url = armarUrl(controller, event)
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }

    let response;    
    if (payload) {
        response = await fetch(url, {
            method: 'GET',
            headers,
            body: JSON.stringify(payload)
        })
    } else {
        response = await fetch(url, {
            method: 'GET',
            headers
        })
    }

    return response.json()
}

// export function post apirest
export const postData = async (controller: string, event: string, payload: any) => {
    const url = armarUrl(controller, event)
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
    
    return await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    })    
}

export const postDataJSON = async (controller: string, event: string, payload: any) => {
    const url = armarUrl(controller, event)
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
    const _rpt = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    })

    return _rpt.json()
}

// export function put apirest
export const putData = async (controller: string, event: string, payload: any = null) => {
    const url = armarUrl(controller, event)
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
    return await fetch(url, {
        method: 'PUT',
        headers,
        body: payload ? JSON.stringify(payload) : payload
    })
}

// export function delete apirest
export const deleteData = async (controller: string, event: string) => {
    const url = armarUrl(controller, event)
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
    return await fetch(url, {
        method: 'DELETE',
        headers
    })
}
