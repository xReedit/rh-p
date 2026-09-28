<script>
    // micss.css VA PRIMERO, y no es cosmetico.
    //
    // Los dos archivos empiezan con `@tailwind base`, asi que el "preflight" de
    // Tailwind sale duplicado. Entre sus reglas esta:
    //     button,[type=button],[type=submit] { background-color: transparent }
    // que pesa lo mismo que una utilidad como `bg-sky-600` -- y en un empate
    // gana la que va ultima. Con micss.css al final, su copia del preflight
    // quedaba despues de las utilidades y le borraba el fondo a TODO boton
    // `type="submit"`: el de Entrar salia en blanco, con el texto blanco
    // encima y por lo tanto invisible.
    //
    // Poniendolo primero, las utilidades vuelven a ser las ultimas y ganan.
    import '$root/styles/micss.css';
    import "../app.css";
    import '$root/js/all.min.js';
    import Toolbar from '$root/components/Toolbar.svelte'       

</script>

<style lang="postcss">
  :global(html) {
    background-color: theme(colors.gray.100);
  }
</style>

<Toolbar />

<main>
    <div class="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">      
      <div class="px-4 py-6 sm:px-0">
        <div class="h-full rounded-lg border-2 border-gray-200 bg-white">
            <slot></slot>
        </div>
      </div>      
    </div>
</main>

