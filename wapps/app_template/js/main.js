/*
    Main js entry for template ATON web-app
===============================================*/
// Realize our app
let APP = ATON.App.realize();

// APP.setup() is required for web-app initialization
APP.setup = () => {

    // Realize base ATON and add base UI events
    ATON.realize();
    ATON.UI.addBasicEvents();

    // FIX: Assign unique identifiers to match your scene graph and UI buttons!
    ATON.createSceneNode("classroom").load("samples/models/skyphos/basic_classroom.glb").attachToRoot();
    
    ATON.createSceneNode("newton_3rd_law").load("samples/models/skyphos/Newton_craddle_onDesk.glb").attachToRoot();

    ATON.createSceneNode("Block_model").load("samples/models/skyphos/Block_model.glb").attachToRoot();
    
    // Wait for plugins to be ready
    ATON.on("AllFlaresReady",()=>{
        console.log("All flares ready");
    });
};