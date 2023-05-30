<script>        
    import { onMount } from "svelte";
	  import { goto } from "$app/navigation";   
    import { page } from '$app/stores'; 
    import { login, loginRestobar } from '$root/services/login.services'

    let user = $page.url.searchParams.get('us')        
    // const idSedeRestobar = JSON.parse(user).sede.idsede_restobar
    user = atob(user)
    // console.log('user', user)

    onMount(async () => {            
      const rpt = await loginRestobar(user)            

      if (rpt.status === 200) {
            const { token } = await rpt.json();
            localStorage.setItem('token', token);
            goto(`./panel`) // opciones
      } else {
        // bno tiene credenciales
        goto(`./`) // opciones
        // console.log('user', user);
      }

    })  
</script>

<h1>
    Cargando
</h1>