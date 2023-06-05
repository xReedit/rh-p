import { PUBLIC_API_KEY, PUBLIC_URL_LOGIN_OUT_USER } from '$env/static/public'

export const login = async (formData: any) => {
    const url = `${PUBLIC_API_KEY}/login`
    localStorage.setItem('token', '');
    return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formData
    })
}

export const loginRestobar = async (formData: any) => {
    const url = `${PUBLIC_API_KEY}/login-restobar/login`
    localStorage.setItem('token', '');
    return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formData
    })
}

//verify login status
export const verifyLogin = async () => {
    // try {        
    const url = `${PUBLIC_API_KEY}/verify-login`

    const params = {
        token: localStorage.getItem('token') || ''
    }

    return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })

}

//
export const isLogin = async () => {
    const rpt = await verifyLogin()    

    if (rpt.status === 401) {
        window.location.href = PUBLIC_URL_LOGIN_OUT_USER
    }
}

export const getValueToken = (key: string): any => {
    // if (localStorage.getItem('token')) {
        const token = localStorage.getItem('token')?.split('.')[1];
        const _data = JSON.parse(atob(token))    
        if (_data[key] ){
            return _data[key]            
        } else {
            console.log(`token key ${key} not exist`, _data);
            return false
        }        
    // } else {
    //     return false
    // }
}
