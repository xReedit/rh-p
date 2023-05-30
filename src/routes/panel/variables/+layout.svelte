<script lang="ts">
    import { fly } from 'svelte/transition'
    import AddVariable from '$root/components/Add-variable.svelte';
	import {IdVariableStorage} from '$root/Store';

    let showModal = false    
    let idtipo_variable = 1

    // $: idtipo_variable


    const activeTab = (event: Event) => {        
        // console.log('event.target', event.target.dataset.id);
        idtipo_variable = event.target.dataset.id
        const listElements = event.target.parentNode.parentNode.querySelectorAll('a')        
        listElements.forEach(e => e.classList.remove('active'));
        event.target.classList.add('active');        
    }

    function openDialogAdd() {        
        IdVariableStorage.set(idtipo_variable)
        handleToggleModal();
    }

    function handleToggleModal() {
        showModal = !showModal
    }


</script>

<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">
    <div class="flex justify-between items-center">
        <div class="w-80">        
            <p class="text-xl font-medium">Variables</p>
            <p class="font-light text-sm text-gray-600">Variables para el cálculo de la remuneracón. Ingresos, Descuentos, Aportaciones.</p>
        </div>
        <div class="w-40 flex flex-wrap justify-end text-right">
            <a class="btn btn-secondary" href="../"><i class="fa fa-arrow-left mr-1"></i> Atras</a>                        
            <button class="btn btn-primary mt-2" on:click={openDialogAdd}><i class="fa fa-plus"></i>Agregar</button>
        </div>
    </div>
    <br>

    <div class="tabs-group flex justify-between items-center">        
        <ul>
            <li>                
                <a href="./ingresos"
                    class="active"              
                    aria-selected="true"
                    data-id="1"
                    on:click={activeTab}
                    >
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path></svg>Ingresos
                </a>
            </li>
            <li>
                <a href="./descuentos" 
                    data-id="2"
                    on:click={activeTab}>
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>Descuentos
                </a>
            </li>
            <li>
                <a href="./aportes" 
                    data-id="3"
                    on:click={activeTab}>
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg>Aportes
                </a>
            </li>
            <!-- <li>
                <a href="#" on:click={activeTab}>
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>Contacts
                </a>
            </li>             -->
        </ul>        
    </div>

    <!-- title={titleModal}
    idtipo_variable={idtipo_variable} -->

    <AddVariable
        open={showModal}
        on:close={() => handleToggleModal()}        
        on:closeSuccess={() => handleToggleModal()}
        >
    </AddVariable>

    

    <div>
        <slot></slot>        
    </div>
</div>