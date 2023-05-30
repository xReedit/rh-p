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
        dispatch('getItem', {item: itemSeleted})
    }
</script>


<select bind:value={itemSeleted} required>
    {#each items as item}
        <option value="{item}">{item.descripcion}</option>
    {/each}
</select>

{#if itemSeleted.fijo}

    {#if itemSeleted.fijo === '1'}
        <!-- <label>   -->
        <input 
            class="uppercase"
            type="number"
            name="descripcion"         
            bind:value={itemSeleted.valor}
            required />
        <!-- </label>   -->
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
