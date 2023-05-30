<script lang="ts">
    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services'    
    import { fade } from 'svelte/transition'
    

    onMount(async () => {        
        isLogin()
    })

</script>

<div in:fade class="max-w-2xl m-auto p-5 text-center flex justify-center items-start flex-wrap">    

    <a href="../panel/empleados/list" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        <div class="flex items-center">
            <div class="bg-sky-300 p-1 rounded text-center mr-1">
                <i class="fa-solid fa-user-group"></i>
            </div>
            <p class="title font-medium text-lg">Empleados</p>
        </div>
        <p class="font-light text-sm">Aquí están todos los empleados de tu empresa, incluyendo los pasados.</p>
    </a>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <a href="../panel/roles" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        <div class="flex items-center">
            <div class="bg-yellow-300 p-1 rounded text-center mr-1">
                <i class="fa-solid fa-guitar"></i>
            </div>
            <p class="title font-medium text-lg">Roles</p>
        </div>
        <p class="font-light text-sm">Los roles son actividades que contribuyen a los objetivos de la empresa.</p>
    </a>

    <a href="../panel/planilla/list" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        
        <div class="flex items-center">
            <div class="bg-lime-300 p-1 rounded text-center mr-1">
                <i class="fa-solid fa-table"></i>
            </div>
            <p class="title font-medium">Gestión de Planilla</p>
        </div>
        <p class="font-light text-sm">Gestione sus pagos, adelantos, descuentos, imprimir boletas de pago.</p>
    </a>

    <a href="../panel/variables/ingresos" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        <div class="flex items-center">
            <div class="bg-orange-500 p-1 rounded text-center mr-1">
                    <i class="fa-solid fa-scissors"></i>
            </div>
            <p class="title font-medium">Variables de Cálculo</p>
        </div>
        <p class="font-light text-sm">Variables para el cálculo de la remuneracón. Ingresos, Descuentos, Aportaciones.</p>
    </a>

    <a href="../panel/area" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        <div class="flex items-center">
            <div class="bg-sky-500 p-1 rounded text-center mr-1">
                    <i class="fa-solid fa-table"></i>
            </div>
            <p class="title font-medium">Area</p>
        </div>
        <p class="font-light text-sm">Area que integran los empleados.</p>
    </a>

    <a href="../panel/sucursal" class="w-60 border-2 rounded-lg m-2 p-3 text-left hover:shadow hover:bg-slate-50 cursor-pointer">
        <div class="flex items-center">
            <div class="bg-violet-500 p-1 rounded text-center mr-1">
                    <i class="fa-solid fa-home"></i>
            </div>
            <p class="title font-medium">Centro de trabajo</p>
        </div>
        <p class="font-light text-sm">Sucursales o sedes de trabajo.</p>
    </a>


    
</div>