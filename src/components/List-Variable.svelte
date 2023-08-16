<script lang="ts">	
	import { createEventDispatcher } from "svelte";

    export let items = []
    let itemSeleted: any = {}        
    let checkPermanente = false
    itemSeleted = items[0]

    itemSeleted.permanente = '0'

    const dispatch = createEventDispatcher()


    function changeCheckPermanente(e) {
        checkPermanente = e.target.checked
        itemSeleted.permanente = checkPermanente ? '1' : '0'
    }

    function fireEvent() {
        itemSeleted.permanente = checkPermanente ? '1' : '0'        
        console.log('itemSeleted', itemSeleted);
        dispatch('getItem', {item: itemSeleted})
    }
</script>

<label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="select_concepto">
    Concepto
</label>

<select bind:value={itemSeleted} required id="select_concepto">
    {#each items as item}
        <option value="{item}">{item.descripcion}</option>
    {/each}
</select>

<!-- fecha de descuento -->
<div class="">
    <div>
        <label class="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300" for="fecha_descuento">
            Fecha de Registro
        </label>
        <input 
            type="date" 
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50" 
            name="fecha_descuento" 
            bind:value={itemSeleted.fecha_registro}
            required />
    </div>
    <div>
        <!-- motivo de registro -->
        <label class="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300" for="motivo">
            Observaciones
        </label>
        <input 
            placeholder="Motivo de registro"
            type="text" 
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50" 
            name="motivo" 
            bind:value={itemSeleted.observaciones}
            />
    </div>
</div>

{#if itemSeleted.fijo}

    {#if itemSeleted.fijo === '1'}
        <label class="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300" for="text_importe">
            Importe
        </label>
        <!-- <label>   -->
        <input 
            class="uppercase"
            type="number"
            name="descripcion"         
            id="text_importe"
            bind:value={itemSeleted.valor}
            required />
        <!-- </label>   -->
        <br>
        <p class="text-gray-500 mb-2">Indique un importe fijo</p>

        <hr>                
        
    {:else}
        <p class="mt-2"><span class="badge primary">{itemSeleted.valor} % de {itemSeleted.variables_globales.descripcion} </span>
        </p>
    {/if}

{/if}

<label> 
    <div class="flex items-center mt-2">
        <input type="checkbox" class="checkbox-1 mr-1 cursor-pointer check-dia" id="check-permanente" on:change={(e) => changeCheckPermanente(e)}>
        <label for="check-permanente" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Este registro es permanente</label>
    </div>
</label>
<p hidden={!checkPermanente} class="text-xs text-gray-500 mb-2">Se mantendrá en la boleta de pago hasta <br>que se elimine</p>
<hr> 

<br>
<div>
    <button class="btn btn-primary" on:click={() => fireEvent()} >Listo</button>
</div>
