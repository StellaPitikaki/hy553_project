/*===========================================================================

    "Hathor" v2
    UI routines

    Author: B. Fanini
    Enhanced with Single-Button Physics Loop Controllers 
    and Local UV-Corrected Asynchronous PDF Text Projection Engines

===========================================================================*/
import WYSIWYG from "./WYSIWYG.js";

let UI = {};

// 1. Global state to track captured mixers
UI.physicsState = {
    isPlaying: true,
    mixers: []
};

// Global State Tracking for Local PDF Input with Polling Loop Initialized
UI.pdfState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    canvas: document.createElement('canvas'), // Hidden background scratch canvas
    texture: null,
    retryCount: 0
};

// 2. THE PROTOTYPE INTERCEPTOR: Catches all mixers natively when they frame-tick
if (typeof THREE !== 'undefined' && THREE.AnimationMixer && THREE.AnimationMixer.prototype) {
    const originalUpdate = THREE.AnimationMixer.prototype.update;
    
    THREE.AnimationMixer.prototype.update = function(deltaTime) {
        // Automatically self-register this mixer instance if we haven't tracked it yet
        if (!UI.physicsState.mixers.includes(this)) {
            UI.physicsState.mixers.push(this);
            console.log("[Physics] Successfully hooked into an active framework animation loop mixer!");
        }

        // If the user clicked pause, freeze the animation loop by forcing deltaTime to 0
        if (!UI.physicsState.isPlaying) {
            return originalUpdate.call(this, 0);
        }

        return originalUpdate.call(this, deltaTime);
    };
}

// DYNAMIC LIBRARY INJECTION: Auto-load Mozilla's PDF.js via public CDN
if (typeof pdfjsLib === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        console.log("[PDF Engine] Local processing framework loaded successfully.");
    };
    document.head.appendChild(script);
}

// SLICER ENGINE: Processes raw uploaded binary data into interactive slides
UI.loadLocalPDFData = (arrayBuffer) => {
    if (typeof pdfjsLib === 'undefined') {
        console.error("[PDF Engine] Library not fully initialized yet. Wait a second and retry.");
        return;
    }
    
    pdfjsLib.getDocument({ 
        data: arrayBuffer,
        disableFontFace: true 
    }).promise.then(pdf => {
        UI.pdfState.pdfDoc = pdf;
        UI.pdfState.totalPages = pdf.numPages;
        UI.pdfState.currentPage = 1;
        UI.pdfState.retryCount = 0; 
        console.log(`[PDF Engine] Local file parsed successfully! Total text slides: ${pdf.numPages}`);
        UI.renderPDFPage(1); // Auto-render slide 1 instantly on upload
    }).catch(err => {
        console.error("[PDF Engine] Error parsing PDF data stream: ", err);
    });
};

// TEXT EXTRACTOR PRESENTATION PASS ENGINE: Assembles and transforms raw lines into visible assets
UI.renderPDFPage = (pageNum) => {
    if (!UI.pdfState.pdfDoc) return;
    UI.pdfState.retryCount = 0; 
    
    UI.pdfState.pdfDoc.getPage(pageNum).then(page => {
        page.getTextContent().then(textContent => {
            const canvas = UI.pdfState.canvas;
            
            canvas.width = 2048;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let textItems = textContent.items;
            if (!textItems || textItems.length === 0) {
                ctx.fillStyle = '#ff4757';
                ctx.font = 'bold 65px sans-serif';
                ctx.fillText("[Image Element Slide - No Extractable String Found]", 150, 512);
                UI.updateBoardMeshTexture();
                return;
            }

            let baselineMap = {};
            textItems.forEach(item => {
                let yCoord = Math.round(item.transform[5] / 12) * 12; 
                if (!baselineMap[yCoord]) baselineMap[yCoord] = [];
                baselineMap[yCoord].push(item);
            });

            let uniqueBaselines = Object.keys(baselineMap).map(Number).sort((a, b) => b - a);
            let cleanLines = [];

            uniqueBaselines.forEach(y => {
                let horizontalItems = baselineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
                let fullLineSentence = horizontalItems.map(item => item.str).join(" ").replace(/\s+/g, ' ').trim();
                if (fullLineSentence) cleanLines.push(fullLineSentence);
            });

            // Native right alignment anchors elements smoothly without colliding
            ctx.textAlign = 'left';
            ctx.fillStyle = '#0a2540'; 
            ctx.font = 'bold 70px Arial, Helvetica, sans-serif';
            ctx.fillText("PHYSICS CLASSROOM PRESENTATION", 80, 110);
            
            ctx.textAlign = 'right';
            ctx.font = 'bold 55px Arial, Helvetica, sans-serif';
            ctx.fillStyle = '#627d98'; 
            ctx.fillText(`Slide Page: ${pageNum} / ${UI.pdfState.totalPages}`, 1968, 110);
            
            ctx.textAlign = 'left';

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(60, 160);
            ctx.lineTo(1988, 160);
            ctx.stroke();

            let startX = 90;
            let startY = 270;
            let bodyLineHeight = 90; 
            let canvasMaxWidth = 1860;

            console.log(`[PDF Engine] Printing Pass for Slide ${pageNum}. Text rows discovered: ${cleanLines.length}`);

            for (let i = 0; i < cleanLines.length; i++) {
                let lineText = cleanLines[i];
                
                if (i === 0 && cleanLines.length > 1 && lineText.length < 65) {
                    ctx.font = 'bold 78px Arial, Helvetica, sans-serif';
                    ctx.fillStyle = '#0f172a';
                    ctx.fillText(lineText, startX, startY);
                    startY += 120;
                    continue;
                }

                ctx.font = '65px Arial, Helvetica, sans-serif';
                ctx.fillStyle = '#1e293b';

                let words = lineText.split(' ');
                let currentWrapLine = '';

                for (let n = 0; n < words.length; n++) {
                    let testLine = currentWrapLine + words[n] + ' ';
                    let textMetrics = ctx.measureText(testLine);
                    
                    if (textMetrics.width > canvasMaxWidth && n > 0) {
                        ctx.fillText(currentWrapLine, startX, startY);
                        currentWrapLine = words[n] + ' ';
                        startY += bodyLineHeight;
                        if (startY > 960) break;
                    } else {
                        currentWrapLine = testLine;
                    }
                }

                if (startY > 960) break; 

                ctx.fillText(currentWrapLine, startX, startY);
                startY += bodyLineHeight + 15; 
            }

            UI.updateBoardMeshTexture();
        });
    });
};

// Maps our dynamically sliced canvas image onto the whiteboard surface mesh inside Board.glb
UI.updateBoardMeshTexture = () => {
    let boardNode = typeof ATON !== 'undefined' ? ATON.getSceneNode("Board") : null;
    
    let mainObj = null;
    if (boardNode) {
        if (boardNode.object3D) mainObj = boardNode.object3D;
        else if (boardNode.group) mainObj = boardNode.group;
        else if (boardNode.root) mainObj = boardNode.root;
        else {
            for (let key in boardNode) {
                if (boardNode[key] && boardNode[key].isObject3D) {
                    mainObj = boardNode[key];
                    break;
                }
            }
        }
    }

    if (!boardNode || !mainObj) {
        if (UI.pdfState.retryCount < 30) { 
            UI.pdfState.retryCount++;
            console.log(`[PDF Engine] Board 3D mesh is loading. Auto-retrying loop (Attempt ${UI.pdfState.retryCount}/30)...`);
            setTimeout(UI.updateBoardMeshTexture, 300); 
        } else {
            console.warn("[PDF Engine] Polling stopped. Could not discover 'Board' scene node.");
        }
        return;
    }

    let targetMeshFound = false;
    let discoveredNames = [];

    mainObj.traverse(child => {
        if (child.isMesh) {
            discoveredNames.push(child.name);

            if (child.name === "white_board" || child.name.toLowerCase().includes("board")) {
                targetMeshFound = true;

                if (child.geometry && child.geometry.attributes.position) {
                    child.geometry.computeBoundingBox();
                    let bbox = child.geometry.boundingBox;
                    
                    let posAttr = child.geometry.attributes.position;
                    let count = posAttr.count;
                    let calculatedUVs = new Float32Array(count * 2);

                    for (let i = 0; i < count; i++) {
                        let y = posAttr.getY(i);
                        let z = posAttr.getZ(i);

                        // Horizontal layout re-mapping equation matches left-to-right progression perfectly
                        let u = 1.0 - ((z - bbox.min.z) / (bbox.max.z - bbox.min.z));
                        let v = (bbox.max.y - y) / (bbox.max.y - bbox.min.y);

                        calculatedUVs[i * 2] = u;
                        calculatedUVs[i * 2 + 1] = v;
                    }

                    child.geometry.setAttribute('uv', new THREE.BufferAttribute(calculatedUVs, 2));
                    child.geometry.attributes.uv.needsUpdate = true;
                }

                let freshTexture = new THREE.CanvasTexture(UI.pdfState.canvas);
                freshTexture.flipY = false; 
                
                freshTexture.wrapS = THREE.ClampToEdgeWrapping;
                freshTexture.wrapT = THREE.ClampToEdgeWrapping;
                
                freshTexture.minFilter = THREE.LinearFilter;
                freshTexture.generateMipmaps = false;
                
                if (THREE.SRGBColorSpace) freshTexture.colorSpace = THREE.SRGBColorSpace;
                
                if (UI.pdfState.texture) {
                    UI.pdfState.texture.dispose(); 
                }
                UI.pdfState.texture = freshTexture;

                child.material = new THREE.MeshBasicMaterial({
                    map: freshTexture,
                    side: THREE.DoubleSide
                });
                child.material.needsUpdate = true;

                console.log(`[PDF Engine] Successfully text-projected slide page ${UI.pdfState.currentPage} onto mesh node: ${child.name}`);
            }
        }
    });

    if (!targetMeshFound) {
        console.warn("[PDF Engine] Failed to identify whiteboard mesh. Available components found inside model:", discoveredNames);
    }
};

UI.WYSIWYG = WYSIWYG;
UI.TASK_SYMBOL = "&rarr;";

UI.setup = ()=>{

    UI.buildBaseInterface();

    // Editor UI
    if (HATHOR.params.get('e')){
        UI.buildEditorInterface();
    }
    else UI.buildStandardInterface();

    ATON.UI.hideElement(UI._elCC);
    ATON.UI.hideElement(UI._elTalkBTN);
    ATON.UI.hideElement(UI._elMyGall);

    // UI elements to hide on interaction
    ATON.on("NavInteraction", b => {
        if (HATHOR.currTask) return;

        if (b){
            UI.hideMainElements();
        }
        else {
            UI.showMainElements();
        }
    });
    
    if (typeof ATON !== 'undefined') {
        ATON.on("nodeAdded", (event) => {
            let node = event.node;
            if (node) {
                let nid = node.nid;
                
                let nodeObj = node.object3D || node.group || node.root;
                if (nodeObj && typeof nodeObj.traverse === 'function') {
                    nodeObj.traverse(child => {
                        child.__atonNodeId = nid;
                    });
                }

                if (nid === "Board") {
                    console.log("[PDF Engine] Board asset detected in scene graph. Applying active PDF texture...");
                    setTimeout(() => { 
                        UI.updateBoardMeshTexture(); 
                    }, 250); 
                }
            }
        });
    }
};

/*
    UI General
=====================================*/
UI.setTheme = (theme)=>{
    ATON.UI.setTheme(theme);
};

// Side toolbar elements
UI.createMainButton = ()=>{
    return ATON.UI.createButton({
        icon: "hathor",
        tooltip: "Hathor",
        classes: "hathor-main-btn",
        onpress: UI.modalHathor
    });
};

UI.createMyGalleryButton = ()=>{
    UI._elMyGall = ATON.UI.createButton({
        icon: "gallery",
        onpress: ()=>{
            window.location.href = ATON.BASE_URL + "/myscenes";
        }
    });

    UI._elTB.push(UI._elMyGall);
    return UI._elMyGall;
};

UI.createXRButton = ()=>{
    UI._elXR = ATON.UI.createButton({
        icon: "xr",
        tooltip: "AR and VR",
        onpress: UI.modalXR
    });

    if (ATON.device.xrSupported['immersive-vr'] || ATON.device.xrSupported['immersive-ar']) ATON.UI.showElement(UI._elXR);
    else ATON.UI.hideElement(UI._elXR);

    ATON.on("XR_support", d => {
        if (ATON.device.xrSupported['immersive-vr'] || ATON.device.xrSupported['immersive-ar']) ATON.UI.showElement(UI._elXR);
        else ATON.UI.hideElement(UI._elXR);
    });

    UI._elTB.push(UI._elXR);

    return UI._elXR;
};

UI.createButtonShare = ()=>{
    let elBody = ATON.UI.createContainer({
        style: "text-align: left"
    });

    let elEmbed = ATON.UI.createContainer();

    elEmbed.append(
        UI.createTextBlock("Embed in your website a static cover that links to this 3D scene or an interactive component (iframe)"),
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({
                    text: "Static cover",
                    icon: "bi-copy",
                    classes: "btn-default",
                    onpress: ()=>{
                        let html = HATHOR.generateSceneEmbedHTML({ static: true });

                        navigator.clipboard.writeText(html).then(
                            () => {
                                ATON.UI.showModal({
                                    header: "Embed",
                                    body: "HTML copied!"
                                })
                            }
                        );
                    }
                }),

                ATON.UI.createButton({
                    text: "Interactive",
                    icon: "bi-copy",
                    classes: "btn-default",
                    onpress: ()=>{
                        let html = HATHOR.generateSceneEmbedHTML({});

                        navigator.clipboard.writeText(html).then(
                            () => {
                                ATON.UI.showModal({
                                    header: "Embed",
                                    body: "HTML copied!"
                                })
                            }
                        );
                    }
                })
            ]
        })
    );

    elBody.append(
        ATON.UI.createTreeGroup({
            items:[{
                title: "Embed",
                content: elEmbed
            }]
        })
    );

    UI._elShare = ATON.UI.createButtonQR({
        title: "Share",
        content: elBody
    });

    return UI._elShare;
};

UI.createLayersButton = ()=>{
    UI._elLayers = ATON.UI.createButton({
        icon: "layers",
        tooltip: "Manage layers",
        onpress: UI.sideLayers
    });

    UI._elTB.push(UI._elLayers);

    return UI._elLayers;
};

UI.createSemanticsButton = ()=>{
    UI._elSem = ATON.UI.createButton({
        icon: "annotation",
        tooltip: "Create and manage semantic annotations",
        onpress: UI.sideSemantics
    });

    UI._elTB.push(UI._elSem);

    return UI._elSem;
};

UI.createEnvButton = ()=>{
    UI._elEnv = ATON.UI.createButton({
        icon: "env",
        tooltip: "Environment setup",
        onpress: UI.sideEnv
    });

    UI._elTB.push(UI._elEnv);

    return UI._elEnv;
};

UI.createSceneButton = ()=>{
    UI._elScene = ATON.UI.createButton({
        icon: "info",
        tooltip: "Scene general information",
        onpress: UI.sideScene
    });

    UI._elTB.push(UI._elScene);

    return UI._elScene;
};

UI.createNavButton = ()=>{
    UI._elNav = ATON.UI.createButton({
        icon: "nav",
        tooltip: "Navigation",
        onpress: UI.sideNav
    });

    UI._elTB.push(UI._elNav);

    return UI._elNav;
};

UI.createFXButton = ()=>{
    UI._elFX = ATON.UI.createButton({
        icon: "fx",
        tooltip: "Post-processing Effects",
        onpress: UI.sideFX
    });

    if (ATON.device.lowGPU || ATON.device.isMobile) ATON.UI.hideElement(UI._elFX);

    UI._elTB.push(UI._elFX);

    return UI._elFX;
};

UI.createCollabButton = ()=>{
    UI._elPhoton = ATON.UI.createButton({
        icon: "users",
        tooltip: "Collaborative session",
        onpress: UI.sideCollab
    });

    return UI._elPhoton;
};

UI.createCopyrightsButton = ()=>{
    UI._elCC = ATON.UI.createButton({
        icon: "cc",
        tooltip: "Copyrights/metadata information",
        onpress: UI.modalCopyrights
    });

    return UI._elCC;
};

UI.createToolsButton = ()=>{
    UI._elTools = ATON.UI.createButton({
        icon: "tools",
        tooltip: "Tools",
        onpress: UI.sideTools
    });

    UI._elTB.push(UI._elTools);

    return UI._elTools;
};

UI.createButtonUser = ()=>{
    let elLoggedContent = ATON.UI.createContainer();

    let bEditor = HATHOR.isEditorMode();
    console.log(bEditor);

    UI._elModeSTD = ATON.UI.createButton({
        text: "Presentation", 
        icon: "bi-easel",
        classes: "btn-default",
        tooltip: "How your 3D scene will be presented to general users",
        onpress: ()=>{
            HATHOR.exitEditorMode();
            ATON.UI.hideModal();
        }
    });

    UI._elModeED = ATON.UI.createButton({
        text: "Editor",
        icon: "edit",
        classes: "btn-default",
        tooltip: "Compose, edit and enrich this 3D scene",
        onpress: ()=>{
            HATHOR.enterEditorMode();
            ATON.UI.hideModal();
        }
    });

    if (bEditor){
        UI._elModeED.classList.add("aton-btn-highlight");
        UI._elModeSTD.classList.remove("aton-btn-highlight");
    }
    else {
        UI._elModeED.classList.remove("aton-btn-highlight");
        UI._elModeSTD.classList.add("aton-btn-highlight");      
    }

    elLoggedContent.append(
        ATON.UI.createButton({
            text: "My Scenes",
            icon: "gallery",
            classes: "w-100 btn-default",
            onpress: ()=>{
                window.location.href = ATON.BASE_URL + "/myscenes";
            }
        }),

        ATON.UI.createContainer({
            classes: "hathor-panel-section",
            items:[
                UI.createTextBlock("Switch between Presentation or Editor mode in Hathor. Presentation is how your 3D scene will be presented to general users, while Editor allows to compose, edit and enrich your 3D scene."),
                UI.createBlockGroup({items:[ UI._elModeSTD, UI._elModeED ]})
            ]
        })
    );

    let el = ATON.UI.createButtonUser({
        onmodalopen: ()=>{
            UI.closeToolPanel();
        },
        modallogged: elLoggedContent,
    });

    return el;
};

UI.openUserModal = ()=>{
    if (UI._elUser) UI._elUser.click();
};

UI.buildBaseInterface = ()=>{
    UI._elMainToolbar   = ATON.UI.get("sideToolbar");
    UI._elBottomToolbar = ATON.UI.get("bottomToolbar");
    UI._elUserToolbar   = ATON.UI.get("userToolbar");
    UI._elTasks         = ATON.UI.get("tasks");
    UI._elTaskDescr     = ATON.UI.get("task-descr");

    ATON.UI.hideElement(UI._elTasks);
    ATON.UI.hideElement(UI._elTaskDescr);

    UI._elSidePanel = ATON.UI.elem(`
        <div class="offcanvas offcanvas-start aton-std-bg aton-sidepanel hathor-side-panel" tabindex="-1">
        </div>
    `);
    UI._sidepanel = new bootstrap.Offcanvas(UI._elSidePanel);
    document.body.append(UI._elSidePanel);
    UI._bSidePanel = false;

    UI._elPOVprev = ATON.UI.createButton({
        icon: "left",
        tooltip: "Previous viewpoint",
        onpress: ()=>{
            ATON.Nav.requestPrevPOVinPath(HATHOR.POVPATH_ALL);
        }
    });

    UI._elPOVnext = ATON.UI.createButton({
        icon: "right",
        tooltip: "Next viewpoint",
        onpress: ()=>{
            ATON.Nav.requestNextPOVinPath(HATHOR.POVPATH_ALL);
        }
    });

    UI._elTalkBTN = ATON.UI.createButtonTalk();

    UI._elBottomToolbar.append(
        UI._elPOVprev,
        ATON.UI.createButtonHome(),
        UI._elTalkBTN,
        UI._elPOVnext
    );

    UI._elUser = UI.createButtonUser();
    UI._elUserToolbar.append( UI._elUser );
};

UI.buildStandardInterface = ()=>{
    UI._elMainToolbar.innerHTML = "";
    UI._elTB = [];

    if (HATHOR._tb){
        HATHOR._tb = String(HATHOR._tb);
        let elements = HATHOR._tb.split(",");
        UI.buildCustomInterface(elements);
        return;
    }

    UI._elMainToolbar.append(
        UI.createMainButton(),
        ATON.UI.createButtonFullscreen(),
        UI.createLayersButton(),
        UI.createEnvButton(),
        UI.createToolsButton(),
        UI.createNavButton(),
        UI.createFXButton(),
        UI.createSceneButton(),
        UI.createCollabButton(),
        UI.createButtonShare(),
        UI.createXRButton(),
        UI.createCopyrightsButton()
    );

    UI.postToolbar();
};

UI.buildEditorInterface = ()=>{
    UI._elMainToolbar.innerHTML = "";
    UI._elTB = [];

    UI._elMainToolbar.append(
        UI.createMainButton(),
        ATON.UI.createButtonFullscreen(),
        UI.createLayersButton(),
        UI.createEnvButton(),
        UI.createToolsButton(),
        UI.createNavButton(),
        UI.createSemanticsButton(),
        UI.createFXButton(),
        UI.createSceneButton(),
        UI.createCollabButton(),
        UI.createButtonShare(),
        UI.createXRButton(),
        UI.createCopyrightsButton()
    );

    UI.postToolbar();
};

UI.buildCustomInterface = (elements)=>{
    UI._elMainToolbar.append( UI.createMainButton() );

    for (let e in elements){
        const E = elements[e];
        if (E === "nav")    UI._elMainToolbar.append(UI.createNavButton());
        if (E === "layers") UI._elMainToolbar.append(UI.createLayersButton());
        if (E === "cc")     UI._elMainToolbar.append(UI.createCopyrightsButton());
        if (E === "fx")     UI._elMainToolbar.append(UI.createFXButton());
        if (E === "tools")  UI._elMainToolbar.append(UI.createToolsButton());
        if (E === "xr")     UI._elMainToolbar.append(UI.createXRButton());
        if (E === "ar")     UI._elMainToolbar.append(ATON.UI.createButtonAR());
        if (E === "vr")     UI._elMainToolbar.append(ATON.UI.createButtonVR());
        if (E === "share")  UI._elMainToolbar.append(UI.createButtonShare());
        if (E === "fs")     UI._elMainToolbar.append(ATON.UI.createButtonFullscreen());
        if (E === "scene" || E === "info") UI._elMainToolbar.append(UI.createSceneButton());
    }
    UI.postToolbar();
};

UI.postToolbar = ()=>{
    if (!ATON.CC.anyCopyrightFound()) ATON.UI.hideElement(UI._elCC);
};

UI.highlightTBPanel = (el)=>{
    for (let e in UI._elTB) UI._elTB[e].classList.remove("aton-btn-highlight");
    if (el) el.classList.add("aton-btn-highlight");
};

UI.hideMainElements = ()=>{
    ATON.UI.hideElement(UI._elMainToolbar);
    ATON.UI.hideElement(UI._elBottomToolbar);
    ATON.UI.hideElement(UI._elUserToolbar);
    ATON.UI.hideElement(UI._elSidePanel);
};

UI.showMainElements = ()=>{
    ATON.UI.showElement(UI._elMainToolbar);
    ATON.UI.showElement(UI._elBottomToolbar);
    ATON.UI.showElement(UI._elUserToolbar);
    ATON.UI.showElement(UI._elSidePanel);
};

UI.enterEditorMode = ()=>{
    UI.buildEditorInterface();
    UI._elMainToolbar.classList.add("hathor-main-toolbar-editor");
    if (UI._elModeED)  UI._elModeED.classList.add("aton-btn-highlight");
    if (UI._elModeSTD) UI._elModeSTD.classList.remove("aton-btn-highlight");
};

UI.exitEditorMode = ()=>{
    UI.buildStandardInterface();
    UI._elMainToolbar.classList.remove("hathor-main-toolbar-editor");
    if (UI._elModeED)  UI._elModeED.classList.remove("aton-btn-highlight");
    if (UI._elModeSTD) UI._elModeSTD.classList.add("aton-btn-highlight");
    HATHOR.SUI.detachGizmo();
};

UI.createTextBlock = (content)=>{
    let el = ATON.UI.createContainer({ classes: "hathor-text-block" });
    if (content) el.append(content);
    return el;
}

UI.createBlockGroup = (options)=>{
    let el = ATON.UI.createContainer({ classes: "btn-group", style: "width:100%;" });
    if (options.items) for (let e in options.items) el.append(options.items[e]);
    return el;
};

/*
    Semantics Workspace Nodes
=====================================*/
UI.showSemanticPanel = (semid)=>{
    UI.closeToolPanel();
    let htmlContent = HATHOR.getHTMLDescriptionFromSemNode(semid);
    if (!htmlContent) return;

    let elContent = ATON.UI.elem("<div>"+htmlContent+"</div>");
    let editbtns = [];

    if (HATHOR.isEditorMode()){
        editbtns.push(
            ATON.UI.createButton({
                icon: "edit",
                classes: "btn-default",
                onpress: ()=>{
                    UI.modalAnnotation(semid);
                    ATON.UI.hideSidePanel();
                }
            }),
        );
    }

    ATON.UI.showSidePanel({
        header: semid,
        actions: editbtns,
        body: elContent
    });
};

UI.closeSemanticPanel = ()=>{
    ATON.UI.hideSidePanel();
};

UI.modalAnnotation = (semid)=>{
    let semshape; 
    if (HATHOR.currTask === HATHOR.TASK_BASIC_ANN)  semshape = HATHOR.SEM_SHAPE_SPHERE;
    if (HATHOR.currTask === HATHOR.TASK_CONVEX_ANN) semshape = HATHOR.SEM_SHAPE_CONVEX;

    let html = undefined; 
    let parentSemID = ATON.ROOT_NID;
    let elBody = ATON.UI.createContainer({});
    let elFooter = ATON.UI.createContainer({ classes: "w-100" });

    let semlist = [];
    for (let s in ATON.semnodes){
        if (s !== ATON.ROOT_NID) semlist.push(s);
    }

    let elSemID = ATON.UI.createInputText({
        list: semlist,
        label: "Semantic ID *",
        oninput: (v)=>{
            let V = HATHOR.validateSemID(v);
            if ( !V.valid ){
                elCreateAnn.setAttribute("disabled",true);
                return;
            }
            semid = V.semid;
            html = HATHOR.getHTMLDescriptionFromSemNode(semid);
            if (html) UI.WYSIWYG.insert(html, true);
            elCreateAnn.removeAttribute("disabled");
        },
    });

    let elCreateAnn = ATON.UI.createButton({
        text: semid? "Update" : "Add",
        classes: "btn-accent",
        onpress: ()=>{
            if (!semid) return;
            let semcontent = UI.WYSIWYG.getHTML().trim();
            if (semcontent.length > 0) semcontent = JSON.stringify(semcontent);
            else semcontent = undefined;

            HATHOR.ED.addSemNode({
                nid: semid,
                parentnid: parentSemID,
                content: semcontent,
                shape: semshape
            });
            ATON.UI.hideModal();
            HATHOR.endCurrentTask();
        }
    });

    let elDelete = undefined;
    if (!semid){
        elCreateAnn.setAttribute("disabled",true); 
        elBody.append(elSemID);
    }
    else {
        elDelete = ATON.UI.createButton({
            text: "Delete",
            icon: "delete",
            classes: "btn-default",
            onpress: ()=>{ UI.modalDeleteSemanticID(semid); }
        })
    }

    elBody.append(UI.WYSIWYG.createElement());
    elFooter.append(
        ATON.UI.createContainer({ classes: "btn-group w-100", items:[ UI.WYSIWYG.createToolbar() ] }),
        ATON.UI.createContainer({ classes: "btn-group w-100", style:"margin-top:16px", items:[ elDelete, elCreateAnn ] })
    )

    ATON.UI.showModal({
        header: semid? "Edit '"+semid+"'" : "New Annotation",
        body: elBody,
        footer: elFooter,
        wide: true
    });

    UI.WYSIWYG.init();
    if (semid){
        html = HATHOR.getHTMLDescriptionFromSemNode(semid);
        if (html) UI.WYSIWYG.insert(html, true);
    }
};

UI.sideSemantics = ()=>{
    let elBody = ATON.UI.createContainer({});

    if (HATHOR.isEditorMode()){
        let elEnrich = ATON.UI.createContainer({ classes: "hathor-panel-section" });
        elBody.append(elEnrich);

        let elSemBasic = ATON.UI.createContainer({});
        elSemBasic.append( UI.createTextBlock("Add a basic (spherical) annotation on any surface"));
        elSemBasic.append(
            UI.createBlockGroup({
                items: [
                    ATON.UI.createButton({
                        text: "Basic " + UI.TASK_SYMBOL,
                        classes: "hathor-btn-task",
                        onpress: ()=>{
                            HATHOR.setCurrentTask(HATHOR.TASK_BASIC_ANN);
                            ATON.UI.setCursorStyle("crosshair");
                        }
                    })
                ]
            })    
        );

        let elSemConvex = ATON.UI.createContainer({});
        elSemConvex.append( UI.createTextBlock("Add a free form (convex hull) annotation on any surface"));
        elSemConvex.append(
            UI.createBlockGroup({
                items: [
                    ATON.UI.createButton({
                        text: "Free Form "+UI.TASK_SYMBOL,
                        classes: "hathor-btn-task",
                        onpress: ()=>{
                            HATHOR.setCurrentTask(HATHOR.TASK_CONVEX_ANN);
                            ATON.UI.setCursorStyle("crosshair");
                        }
                    })
                ]
            })    
        );
        elEnrich.append( elSemBasic, elSemConvex );
    }

    let elSemList = undefined;
    for (let semid in ATON.semnodes){
        if (semid !== ATON.ROOT_NID){
            let S = ATON.getSemanticNode(semid);
            if (!elSemList) elSemList = ATON.UI.createContainer({ classes: "hathor-panel-section"});

            let actions = [];
            if (HATHOR.isEditorMode()){
                actions.push(
                    ATON.UI.createButton({
                        icon: "edit",
                        classes: "btn-default",
                        onpress: ()=>{
                            UI.modalAnnotation(semid);
                            UI.closeToolPanel();
                        }
                    })
                )
            }

            actions.push(
                ATON.UI.createButton({
                    icon: "visibility",
                    status: S.visible,
                    onswitch: (b)=>{
                        if (b) S.show();
                        else S.hide();
                    }
                })
            );

            elSemList.append(
                ATON.UI.createBlockItem({
                    text: semid,
                    mainaction: ()=>{ ATON.Nav.requestPOVbyNode(S, 0.2); },
                    actions: actions
                })
            );
        }
    }

    if (elSemList) elBody.append(ATON.UI.createTreeGroup({
        style: "margin-top: 16px",
        items:[{ title: "Annotations list", open: true, content: elSemList }]
    }));

    UI.highlightTBPanel(UI._elSem);
    UI.openToolPanel({ header: "Semantic Annotations", body: elBody });
};

UI.modalDeleteSemanticID = (semid)=>{
    let S = ATON.getSemanticNode(semid);
    if (!S) return;

    let elBody = ATON.UI.createContainer();
    elBody.append( ATON.UI.elem(`<p>Are you sure you want to delete semantic ID '${semid}'?</p>`) );
    elBody.append(
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "NO", classes: "btn-default", onpress: ATON.UI.hideModal }),
                ATON.UI.createButton({
                    text: "YES",
                    icon: "delete",
                    classes: "btn-accent",
                    onpress: ()=>{
                        HATHOR.ED.deleteNode({ nid: semid, type: ATON.NTYPES.SEM });
                        ATON.UI.hideModal();
                    }
                })
            ]
        })
    );
    ATON.UI.showModal({ header: "Delete layer", body: elBody });
};

UI.modalHathor = ()=>{
    let elBody = ATON.UI.createContainer({});
    let elDark = ATON.UI.createButton({
        icon: "bi-moon-stars",
        classes: "btn-default",
        onpress: ()=>{
            ATON.UI.setTheme("dark");
            elDark.classList.add("aton-btn-highlight");
            elLight.classList.remove("aton-btn-highlight");
        }
    });

    let elLight = ATON.UI.createButton({
        icon: "bi-sun",
        classes: "btn-default",
        onpress: ()=>{
            ATON.UI.setTheme("light");
            elLight.classList.add("aton-btn-highlight");
            elDark.classList.remove("aton-btn-highlight");
        }
    });

    elBody.append(
        ATON.UI.elem(`
            <div style='text-align:center; margin:8px'>
                <img src='${ATON.BASE_URL}/hathor/appicon.png' style='width:100px; height:auto'>
                <br><b>Hathor - v2 (beta)</b>
                <br><span style='font-size:smaller'><i>Hathor</i> is the official front-end of ATON framework</span>
            </div>
        `),
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "Help", icon: "help", classes: "btn-default", onpress: UI.modalHelp }),
                ATON.UI.createButton({ text: "Settings", icon: "settings", classes: "btn-default", onpress: UI.modalSettings }),
                ATON.UI.createButton({ text: "Online", icon: "link", classes: "btn-default", onpress: ()=>{ window.open(HATHOR.WEBSITE_URL, '_blank') } })
            ]
        }),
        ATON.UI.createContainer({ classes: "btn-group", style: "width:100%; margin-top:8px", items:[ elDark, elLight ] })
    );

    if (ATON.UI._theme && ATON.UI._theme === "light"){
        elLight.classList.add("aton-btn-highlight");
        elDark.classList.remove("aton-btn-highlight");
    }
    else {
        elLight.classList.remove("aton-btn-highlight");
        elDark.classList.add("aton-btn-highlight");
    }

    ATON.UI.showModal({ header: "Hathor", body: elBody });
};

UI.modalXR = ()=>{
    let elBody = ATON.UI.createContainer();
    if (ATON.device.xrSupported['immersive-vr']){
        elBody.append(
            UI.createTextBlock("Enter immersive VR session"),
            UI.createBlockGroup({ items:[ ATON.UI.createButtonVR({ classes: "btn-accent", text: "Immersive VR" }) ] })
        );
    }
    if (ATON.device.xrSupported['immersive-ar']){
        elBody.append(
            UI.createTextBlock("Enter Augmented Reality session"),
            UI.createBlockGroup({ items:[ ATON.UI.createButtonAR({ classes: "btn-accent", text: "Augmented Reality" }) ] })
        );
    }
    ATON.UI.showModal({ header: "XR", body: elBody });
};

/*
    Side Accordion Tools Drawer Setup
=====================================*/
UI.openToolPanel = (options)=>{
    if (!options) options = {};
    UI._elSidePanel.innerHTML = "";
    HATHOR.SUI.detachGizmo();

    if (options.header){
        let el = document.createElement('div');
        el.classList.add("offcanvas-header");
        el.innerHTML = "<h4 class='offcanvas-title'>"+options.header+"</h4><button type='button' class='btn-close' data-bs-dismiss='offcanvas' aria-label='Close' onclick='HATHOR.UI.closeToolPanel()'></button>";
        if (options.headelement) el.prepend(options.headelement);
        UI._elSidePanel.append(el);
    }

    if (options.body){
        let el = document.createElement('div');
        el.classList.add("offcanvas-body");
        el.append(options.body);
        UI._elSidePanel.append(el);
    }

    UI._sidepanel.show();
    UI._bSidePanel = true;
    UI.closeSemanticPanel();
};

UI.closeToolPanel = ()=>{
    UI._sidepanel.hide();
    UI._bSidePanel = false;
    ATON.UI.inputFocus(false);
    UI.highlightTBPanel();
    HATHOR.SUI.detachGizmo();
};

//====================================
// Scene
//====================================
UI.sideScene = ()=>{
    if (!ATON.SceneHub.currData) return;
    if (!HATHOR.isEditorMode()){
        UI.modalSceneDescription();
        return;
    }

    let scenedata = ATON.SceneHub.currData;
    let sid = ATON.SceneHub.getSID();
    if (!sid) return;

    let elBody = ATON.UI.createContainer({});
    elBody.append(
        UI.createBlockGroup({
            items: [
                ATON.UI.createButton({
                    text: "Set title and description...",
                    classes: "btn-default",
                    onpress: ()=>{
                        UI.modalEditSceneInfo();
                        UI.closeToolPanel();
                    }
                })
            ]
        })
    );

    let elKeywordsSection = ATON.UI.createContainer({});
    let elCoverSection = ATON.UI.createContainer({});
    let elVisSection = ATON.UI.createContainer({});

    elBody.append( ATON.UI.createTreeGroup({
        items:[
            { title: "Keywords", open: true, content: elKeywordsSection },
            { title: "Cover", open: true, content: elCoverSection },
            { title: "Visibility", open: false, content: elVisSection }
        ]
    }));

    ATON.REQ.get("scenes/keywords", kk => {
        let globallist = [];
        for (let k in kk) globallist.push(k);
        let scenekwords = [];
        if (ATON.SceneHub.currData && ATON.SceneHub.currData.kwords){
            const skw = ATON.SceneHub.currData.kwords;
            for (let k in skw) scenekwords.push(k);
        }

        elKeywordsSection.append(
            UI.createTextBlock("Pick or create keywords to classify this scene."),
            ATON.UI.createTagsComponent({
                list: globallist,
                tags: scenekwords,
                placeholder: "Pick or add a keyword...",
                validator: (k)=> k.length >= 1,
                onaddtag: (k)=>{
                    let O = { kwords: {} };
                    O.kwords[k] = 1;
                    HATHOR.ED.sceneInfo(O);
                },
                onremovetag: (k)=>{ HATHOR.ED.deleteSceneKeyword({ kword: k }); }
            })
        );
    });

    let elCover = ATON.UI.createCard({
        title: "Current scene cover",
        cover: ATON.PATH_RESTAPI2+"scenes/"+sid+"/cover",
        onactivate: ()=>{}
    });

    let img = ATON.UI.getComponent(elCover, "img");
    let elShot = ATON.UI.createButton({
        text: "Set current view as cover",
        classes: "btn-default w-100",
        onpress: ()=>{
            let cover = ATON.Utils.takeScreenshotFromPOV(ATON.Nav._currPOV, 256);
            ATON.REQ.post("scenes/"+sid+"/cover", { img: cover.src }, (r)=>{ img.src = cover.src; });
        }
    });

    elCoverSection.append(ATON.UI.createContainer({ style:"text-align: center", items: [elCover, elShot] }));

    const setVis = (v)=>{
        HATHOR.ED.sceneInfo({ visibility: v });
        if (v===0){
            elPublicBtn.classList.remove("aton-btn-highlight");
            elUnlistedBtn.classList.add("aton-btn-highlight");
        }
        if (v===1){
            elUnlistedBtn.classList.remove("aton-btn-highlight");
            elPublicBtn.classList.add("aton-btn-highlight");   
        }
    };

    let elUnlistedBtn = ATON.UI.createButton({ text: "Unlisted", icon: "bi-eye-slash", classes: "btn-default", onpress: ()=>{ setVis(0); } });
    let elPublicBtn = ATON.UI.createButton({ text: "Public", icon: "public", classes: "btn-default", onpress: ()=>{ setVis(1); } });

    if (scenedata.visibility) setVis(1);
    else setVis(0);

    elVisSection.append(
        ATON.UI.elem("<p class='hathor-text-block'>Control the visibility of your scene.</p>"),
        UI.createBlockGroup({ items: [elUnlistedBtn, elPublicBtn] })
    );

    UI.highlightTBPanel(UI._elScene);
    UI.openToolPanel({ header: "Scene", body: elBody });
};

// --- DESCRIPTION PARSING SAFETY NET ADDED HERE ---
UI.modalSceneDescription = ()=>{
    let title = ATON.SceneHub.getTitle();
    let descr = ATON.SceneHub.getDescription();

    let elBody = ATON.UI.createContainer();

    if (!title || !descr) return;
    if (descr.length < 1 || title.length < 1) return;

    try {
        descr = JSON.parse(descr).trim();
    } catch (e) {
        descr = descr.trim(); 
    }

    elBody.append( ATON.UI.elem("<div>"+descr+"</div>") );
    let elFooter = ATON.UI.createContainer({ classes: "w-100"});

    ATON.UI.showModal({
        header: title,
        body: elBody,
        footer: elFooter,
        wide: true
    });
};

UI.modalEditSceneInfo = ()=>{
    let html = undefined;
    let descr = ATON.SceneHub.getDescription();
    
    if (descr) {
        try {
            html = JSON.parse(descr).trim();
        } catch (e) {
            html = descr.trim();
        }
    }

    let elBody = ATON.UI.createContainer({});
    let elFooter = ATON.UI.createContainer({ classes: "w-100" });

    elBody.append(
        ATON.UI.createInputText({
            label: "Title",
            placeholder: "Please provide a short title...",
            value: ATON.SceneHub.getTitle(),
            clearonsub: false,
            validator: (v)=> v.length > 2,
            onsubmit: (title)=>{
                title = title.trim();
                HATHOR.ED.sceneInfo({title: title});
            }
        })
    );

    let elSetDescr = ATON.UI.createButton({
        text: "Set",
        classes: "btn-accent",
        onpress: ()=>{
            let content = UI.WYSIWYG.getHTML().trim();
            if (content.length > 0) content = JSON.stringify(content);
            else content = undefined;

            HATHOR.ED.sceneInfo({ descr: content });
            ATON.UI.hideModal();
        }
    });

    elBody.append(UI.WYSIWYG.createElement());
    elFooter.append(
        ATON.UI.createContainer({ classes: "btn-group w-100", items:[ UI.WYSIWYG.createToolbar() ] }),
        ATON.UI.createContainer({ classes: "btn-group w-100", style: "margin-top:16px", items:[ elSetDescr ] })
    )

    ATON.UI.showModal({ header: "Edit Scene Description", body: elBody, footer: elFooter, wide: true });
    UI.WYSIWYG.init();
    if (html) UI.WYSIWYG.insert(html, true);
};

//====================================
// Layers
//====================================
UI.sideLayers = ()=>{
    let elLayers = ATON.UI.createContainer({ classes: "hathor-panel-section" });

    const appendNewLayer = (nid)=>{
        const elLayer = ATON.UI.createLayerControl({
            node: nid,
            mainlayeraction: ()=>{ ATON.Nav.requestPOVbyNode(ATON.getSceneNode(nid), 0.2); },
            actions: HATHOR.isEditorMode()? [
                ATON.UI.createButton({ icon: "edit", classes: "btn-default", onpress: ()=>{ UI.sideManageLayer(nid); } })
            ] : []
        });
        elLayers.append( elLayer );
    };

    let root = ATON.getRootScene();
    for (let c in root.children){
        const N = root.children[c];
        if (N.nid) appendNewLayer(N.nid);
    }

    const elNewLayer = ATON.UI.createInputText({
        placeholder: "New Layer...",
        icon: "add",
        validator: (nid)=>{
            if (nid.length < 1) return false;
            if (!HATHOR.ID_VALIDATOR.test(nid)) return false;
            if (ATON.snodes[nid]) return false;
            return true;
        },
        onsubmit: (layer)=>{        
            if (HATHOR.ED.createNode({nid: layer})){ appendNewLayer(layer); }
        }
    });

    UI.highlightTBPanel(UI._elLayers);
    UI.openToolPanel({
        header: "Layers",
        body: ATON.UI.createContainer({ items:[ HATHOR.isEditorMode()? elNewLayer : undefined, elLayers ] })
    });
};

UI.createLayerModels = (N)=>{
    let el = ATON.UI.createContainer();
    let elList = ATON.UI.createContainer({});
    el.append(elList);

    const createItem = (url)=>{
        const fname = ATON.Utils.getFilename(url);
        return UI.elem(`<div class='aton-collection-item'><img src='${ATON.UI.resolveIconURL("collection-item")}'>${fname}</div>`);
    };

    for (let u in N._reqURLs){ elList.append( createItem(u) ); }

    el.append(
        ATON.UI.createInput3DModel({
            actionicon: "add",
            onaction: (url)=>{
                if (!url || url.length < 2) return;
                HATHOR.ED.addModel({ url: url, nid: N.nid })
                elList.append( createItem(url) );
            }
        })
    );
    return el;
};

UI.createMaterialControl = (N)=>{
    if (!N) return undefined;
    let matList = [{ title: "Use original", value: "_" }];

    for (let m in ATON.MatHub._matLib){
        matList.push({ title: ATON.MatHub._matLib[m].title, value: m });
    }

    return ATON.UI.createContainer({
        items:[
            ATON.UI.createSelect({
                title: "Apply material...",
                items: matList,
                onselect: (v)=>{
                    if (v === "_") HATHOR.ED.removeNodeMaterial({ nid: N.nid });
                    else HATHOR.ED.editNode({ nid: N.nid, mat: v });
                }
            })
        ]
    });
};

UI.sideManageLayer = (nid)=>{
    let N = ATON.getSceneNode(nid);
    if (!N) return;

    let elBody = ATON.UI.createContainer();
    elBody.append(
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "Focus", icon: "bi-crosshair", classes: "btn-default", onpress: ()=>{ ATON.Nav.requestPOVbyNode(N, 0.2); } }),
                ATON.UI.createButton({ text: "Delete", icon: "delete", classes: "btn-default", onpress: ()=>{ UI.modalDeleteNode(nid); } })
            ]
        })
    );  

    UI._elTR = []; UI._elTP = []; UI._elTS = [];

    let elTrans = ATON.UI.createNodeTransformControl({
        node: nid, position: true, scale: true, rotation: true,
        onupdateposition: ()=>{ HATHOR.ED.dirtyNodeTransformReq(N, ["pos"]); },
        onupdaterotation: ()=>{ HATHOR.ED.dirtyNodeTransformReq(N, ["rot"]); },
        onupdatescale: ()=>{ HATHOR.ED.dirtyNodeTransformReq(N, ["scl"]); },
        onfocusposition: ()=>{ HATHOR.SUI.attachGizmoToNode(N); HATHOR.SUI.setGizmoMode("translate"); },
        onfocusrotation: ()=>{ HATHOR.SUI.attachGizmoToNode(N); HATHOR.SUI.setGizmoMode("rotate"); },
        onfocusscale: ()=>{ HATHOR.SUI.attachGizmoToNode(N); HATHOR.SUI.setGizmoMode("scale"); }
    });

    let elRot = ATON.UI.getComponent(elTrans, "rotationControl");
    UI._elTR.push(ATON.UI.getComponent(elRot, "inputX"), ATON.UI.getComponent(elRot, "inputY"), ATON.UI.getComponent(elRot, "inputZ"));

    let elPos = ATON.UI.getComponent(elTrans, "positionControl");
    UI._elTP.push(ATON.UI.getComponent(elPos, "inputX"), ATON.UI.getComponent(elPos, "inputY"), ATON.UI.getComponent(elPos, "inputZ"));

    let elScale = ATON.UI.getComponent(elTrans, "scaleControl");
    UI._elTS.push(ATON.UI.getComponent(elScale, "inputX"), ATON.UI.getComponent(elScale, "inputY"), ATON.UI.getComponent(elScale, "inputZ"));

    elBody.append( ATON.UI.createTreeGroup({
        items:[
            { title: "Items", open: true, content: UI.createLayerModels(N) },
            { title: "Transform", open: true, content: ATON.UI.createContainer({
                items:[
                    elTrans,
                    UI.createBlockGroup({
                        items:[
                            ATON.UI.createButton({ text: "Z &#9656; Y", classes: "btn-default", onpress: ()=>{ UI._elTR[0].value = -(Math.PI * 0.5); UI._elTR[0].oninput(); } }),
                            ATON.UI.createButton({ text: "Z &#9656; -Y", classes: "btn-default", onpress: ()=>{ UI._elTR[0].value = (Math.PI * 0.5); UI._elTR[0].oninput(); } })
                        ]
                    }),
                    UI.createBlockGroup({
                        items:[
                            ATON.UI.createButtonSwitch({
                                text: "Use Geo Coords", icon: "bi-globe-europe-africa", classes: "btn-default", status: N.bUseGeoCoords,
                                onswitch: (b)=>{ HATHOR.ED.editNode({ nid: nid, applytransform: true, geocoords: b }) }
                            })
                        ]
                    })
                ]
            })},
            { title: "Material", content: UI.createMaterialControl(N) }
        ]
    }) );

    UI.highlightTBPanel(UI._elLayers);
    UI.openToolPanel({ header: "Layer '"+nid+"'", headelement: ATON.UI.createButton({ icon: "left", onpress: UI.sideLayers }), body: elBody });
};

UI.modalDeleteNode = (nid, type)=>{
    if (!type) type = ATON.NTYPES.SCENE;
    let elBody = ATON.UI.createContainer();
    let elFooter = ATON.UI.createContainer({classes: "w-100"});
    elBody.append( ATON.UI.elem(`<p>Are you sure you want to delete layer ${nid}?</p>`) );

    elFooter.append(
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "NO", classes: "btn-default", onpress: ATON.UI.hideModal }),
                ATON.UI.createButton({
                    text: "YES", icon: "delete", classes: "btn-accent",
                    onpress: ()=>{ HATHOR.ED.deleteNode({ nid: nid, type: type }); ATON.UI.hideModal(); UI.sideLayers(); }
                })
            ]
        })
    );
    ATON.UI.showModal({ header: "Delete layer", body: elBody, footer: elFooter });
};

//====================================
// Environment Setup
//====================================
UI.sideEnv = ()=>{
    let elBody = ATON.UI.createContainer({});
    let elLighting = ATON.UI.createContainer();

    let elCP = ATON.UI.createColorPicker({
        label: "Background color",
        color: "#"+ATON._mainRoot.background.getHexString(),
        onchange: (col)=>{ HATHOR.ED.setBackground({ color: col }); }
    });

    let elBG = ATON.UI.createContainer({});
    
    ATON.checkAuth(
        (u)=>{
            elBG.append( UI.createTextBlock("Filter panoramic assets."), ATON.UI.createLiveFilter({ classes: "w-100", filterclass: "aton-card" }) );
            ATON.REQ.get("items/"+u.username+"/panoramas/", entries => {
                for (let e in entries){
                    let purl = entries[e];
                    let fullurl = ATON.Utils.resolveCollectionURL(purl);
                    if (!ATON.Utils.isImage(fullurl)) fullurl = ATON.PATH_RES+"pano.jpg";

                    elBG.append(
                        ATON.UI.createCard({
                            title: purl, cover: fullurl, classes: "hathor-card-media-v", useblurtint: true,
                            onactivate: ()=>{ HATHOR.ED.setBackground({ bg: purl }); }
                        })
                    )
                } 
            });

            if (ATON._mMainPano) elBG.prepend(
                UI.createBlockGroup({ items:[ ATON.UI.createButton({ text: "Remove Panorama", icon: "delete", classes: "btn-default", onpress: ()=>{ HATHOR.ED.removeBackground({ bg: true }); } }) ] })
            )
        }
    );

    elBody.append(elCP);
    elBody.append( ATON.UI.createTreeGroup({
        items:[
            { title: "Panorama", open: false, content: elBG },
            { title: "Lighting", open: true, content: elLighting }
        ]
    }));

    let elSwitchShadows = ATON.UI.createButtonSwitch({
        icon: "shadows", tooltip: "Shadows ON/OFF", classes: "btn-default", status: ATON.areShadowsEnabled(),
        onswitch: (b)=>{ let ld = ATON.getMainLightDirection(); HATHOR.ED.setLighting({ shadows: b, dir: [ld.x, ld.y, ld.z] }); }
    });

    let elSwitchMainLight = ATON.UI.createButtonSwitch({
        icon: "light", tooltip: "Main light ON/OFF", classes: "btn-default", status: ATON.isMainLightEnabled(),
        onswitch: (b)=>{
            if (b){
                let vD = [0.58,0.58,0.58];
                let ld = ATON.getMainLightDirection();
                if (ld) vD = [ld.x, ld.y, ld.z];
                HATHOR.ED.setLighting({ dir: vD });
                ATON.UI.showElement(elSwitchShadows);
            } else {
                HATHOR.ED.disableMainLight();
                ATON.UI.hideElement(elSwitchShadows);
            }
        }
    });

    elLighting.append(
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "Setup main light "+UI.TASK_SYMBOL, classes: "w-100 hathor-btn-task", onpress: ()=>{ HATHOR.setCurrentTask(HATHOR.TASK_DIR_LIGHT); } }),
                elSwitchShadows, elSwitchMainLight
            ]
        }),
        ATON.UI.createSlider({ label: "General Exposure", range: [0.05, 5.0], step: 0.05, value: ATON.getExposure(), classes: "w-100", oninput: (e)=>{ HATHOR.ED.setLighting({ exp: e }); } }),
        UI.createTextBlock("Estimate light probe."),
        UI.createBlockGroup({ items:[ ATON.UI.createButtonSwitch({ icon: "lp", text: "Auto Probing", classes: "btn-default", status: ATON._bAutoLP, onswitch: (b)=>{ HATHOR.ED.setLighting({ autolp: b }); } }) ] })
    );

    UI.highlightTBPanel(UI._elEnv);
    UI.openToolPanel({ header: "Environment", body: elBody });
    if (!ATON.isMainLightEnabled()) ATON.UI.hideElement(elSwitchShadows);
};

//====================================
// Navigation & Viewpoints
//====================================
UI.sideNav = ()=>{
    let elBody = ATON.UI.createContainer({});
    let elNavModes = ATON.UI.createContainer({classes: "hathor-panel-section"});
    elBody.append(elNavModes);
    elNavModes.append( UI.createTextBlock("Select a navigation mode"), ATON.UI.createNavSwitcher({}) );

    let elPOVs = ATON.UI.createContainer({});
    let elPOVlist = ATON.UI.createContainer({ classes: "hathor-panel-section" });

    let appendPOVitem = (P, povid)=>{
        let actions = [];
        if (HATHOR.isEditorMode()){
            actions.push( ATON.UI.createButton({ icon: "delete", classes: "btn-default", onpress: ()=>{ UI.modalDeletePOV(povid); UI.closeToolPanel(); } }) );
        }
        elPOVlist.append( ATON.UI.createBlockItem({ text: povid, mainaction: ()=>{ ATON.Nav.requestPOV( P, 0.5 ); }, actions: actions }) );
    }

    let refreshPOVList = ()=>{
        elPOVlist.innerHTML = "";
        let numpovs = 0;
        for (let pov in ATON.Nav.povlist){ numpovs++; appendPOVitem(ATON.Nav.povlist[pov], pov); }
        if (numpovs>0) elPOVlist.prepend( UI.createTextBlock("List of viewpoints") );
        UI.updatePOVs();

        if (numpovs < 1) { ATON.UI.hideElement(elPOVlist); ATON.UI.hideElement(UI._elPOVprev); ATON.UI.hideElement(UI._elPOVnext); }
        else { ATON.UI.showElement(elPOVlist); ATON.UI.showElement(UI._elPOVprev); ATON.UI.showElement(UI._elPOVnext); }
    };

    let elCurrPOV = ATON.UI.createContainer({ classes: "hathor-panel-section" });
    elCurrPOV.append(
        UI.createTextBlock("Current viewpoint"),
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ icon: "home", text: "Set as home", classes: "btn-default", onpress: ()=>{ let pov = ATON.Nav.copyCurrentPOV(); HATHOR.ED.addPOV({ povid: "home", pos: [pov.pos.x, pov.pos.y, pov.pos.z], tgt: [pov.target.x, pov.target.y, pov.target.z], fov: pov.fov }); refreshPOVList(); HATHOR.SUI.buildPOVs(); } }),
                ATON.UI.createButton({ icon: "table", text: "Setup", classes: "btn-default", onpress: ()=>{ UI.sideViewpoint(); } })
            ]
        }),
        ATON.UI.createInputText({
            placeholder: "Save this view as...", icon: "add", classes: "w-100",
            validator: (povid)=> povid.length >= 1 && HATHOR.ID_VALIDATOR.test(povid) && !ATON.Nav.povlist[povid],
            onsubmit: (povid)=>{ let pov = ATON.Nav.copyCurrentPOV(); HATHOR.ED.addPOV({ povid: povid, pos: [pov.pos.x, pov.pos.y, pov.pos.z], tgt: [pov.target.x, pov.target.y, pov.target.z], fov: pov.fov }); refreshPOVList(); HATHOR.SUI.buildPOVs(); }
        })
    );

    if (HATHOR.isEditorMode()) elPOVs.append(elCurrPOV, elPOVlist);
    else elPOVs.append(elPOVlist);

    refreshPOVList();
    elBody.append( ATON.UI.createTreeGroup({ items:[ { title: "Viewpoints (POV)", open: true, content: elPOVs } ] }) );
  
    UI.highlightTBPanel(UI._elNav);
    UI.openToolPanel({ header: "Navigation", body: elBody });
};

UI.updatePOVs = ()=>{
    ATON.Nav.createPOVPath(HATHOR.POVPATH_ALL);
    let povcount = 0;
    for (let pov in ATON.Nav.povlist){ povcount++; ATON.Nav.addPOVtoPath(pov, HATHOR.POVPATH_ALL); }
    if (povcount < 1){ ATON.UI.hideElement(UI._elPOVprev); ATON.UI.hideElement(UI._elPOVnext); }
    else { ATON.UI.showElement(UI._elPOVprev); ATON.UI.showElement(UI._elPOVnext); }
};

UI.modalDeletePOV = (povid)=>{
    if (!povid || !ATON.Nav.povlist[povid]) return; 
    let elBody = ATON.UI.createContainer();
    elBody.append( ATON.UI.elem(`<p>Are you sure you want to delete viewpoint '${povid}'?</p>`) );
    elBody.append(
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "NO", classes: "btn-default", onpress: ATON.UI.hideModal }),
                ATON.UI.createButton({ text: "YES", icon: "delete", classes: "btn-accent", onpress: ()=>{ HATHOR.ED.deletePOV({povid: povid}); HATHOR.SUI.buildPOVs(); ATON.UI.hideModal(); UI.sideNav(); } })
            ]
        })
    );
    ATON.UI.showModal({ header: "Delete Viewpoint", body: elBody });
};

UI.sideViewpoint = (povid)=>{
    let elBody = ATON.UI.createContainer({});
    let elPOVparams = ATON.UI.createContainer({ classes: "hathor-panel-section" });
    let POV = (povid)? ATON.Nav.povlist[povid] : ATON.Nav.copyCurrentPOV();

    POV.pos = ATON.Utils.roundVector3(POV.pos, 3);
    POV.target = ATON.Utils.roundVector3(POV.target, 3);

    elPOVparams.append(
        ATON.UI.elem("<span class='aton-form-label'>Eye (position)</span>"),
        ATON.UI.createVectorControl({ vector: POV.pos, step: 0.1, onupdate: ()=>{ if (!isNaN(POV.pos.x)) ATON.Nav.requestPOV(POV, 0.0); } }),
        ATON.UI.elem("<span class='aton-form-label'>Target</span>"),
        ATON.UI.createVectorControl({ vector: POV.target, step: 0.1, onupdate: ()=>{ if (!isNaN(POV.target.x)) ATON.Nav.requestPOV(POV, 0.0); } }),
        ATON.UI.elem("<span class='aton-form-label'>Field of view (degrees)</span>"),
        ATON.UI.createNumericInput({ range: [5.0, 100.0], step: 1.0, value: POV.fov, onupdate: (v)=>{ if (v >= 5.0 && v <= 100.0) ATON.Nav.setFOV(parseFloat(v)); } })
    );

    elBody.append(elPOVparams);
    UI.highlightTBPanel(UI._elNav);
    UI.openToolPanel({ header: (povid)? "Viewpoint '"+povid+"'" : "Control viewpoint", body: elBody, headelement: ATON.UI.createButton({ icon: "left", onpress: UI.sideNav }) });
};

//====================================
// FX & Copyrights
//====================================
UI.sideFX = ()=>{
    let elBody = ATON.UI.createContainer();
    let elFXAO = ATON.UI.createContainer();
    elFXAO.append(
        UI.createTextBlock("Ambient Occlusion Shadows"),
        ATON.UI.createButtonSwitch({ text: "Enabled", classes: "w-100 btn-default", status: ATON.FX.isPassEnabled(ATON.FX.PASS_AO), onswitch: (b)=>{ if (b) HATHOR.ED.addFX({ ao: {i: 0.2} }); else HATHOR.ED.removeFX({ ao: {} }); } }),
        ATON.UI.createSlider({ range: [0.1,0.5], step: 0.05, value: ATON.FX.getAOintensity(), label: "Intensity", classes: "w-100", oninput: (v)=>{ HATHOR.ED.addFX({ ao: {i: v} }); } })
    );

    let elFXBloom = ATON.UI.createContainer();
    elFXBloom.append(
        UI.createTextBlock("Glow bloom effect"),
        ATON.UI.createButtonSwitch({ text: "Enabled", classes: "w-100 btn-default", status: ATON.FX.isPassEnabled(ATON.FX.PASS_BLOOM), onswitch: (b)=>{ if (b) HATHOR.ED.addFX({ bloom: {i: 0.3} }); else HATHOR.ED.removeFX({ bloom: {} }); } }),
        ATON.UI.createSlider({ range: [0.1,3.0], step: 0.05, value: ATON.FX.getBloomStrength(), label: "Strength", classes: "w-100", oninput: (v)=>{ HATHOR.ED.addFX({ bloom: {i: v} }); } }),
        ATON.UI.createSlider({ range: [0.1,1.0], step: 0.01, value: ATON.FX.getBloomThreshold(), label: "Threshold", classes: "w-100", oninput: (v)=>{ HATHOR.ED.addFX({ bloom: {t: v} }); } })
    );

    elBody.append(ATON.UI.createTreeGroup({ items:[ { title: "Ambient Occlusion", open: true, content: elFXAO }, { title: "Bloom", open: true, content: elFXBloom } ] }));
    UI.highlightTBPanel(UI._elFX);
    UI.openToolPanel({ header: "Post-processing FX", body: elBody }); 
};

UI.modalCopyrights = ()=>{
    if (ATON.CC.list.length < 1) return;
    let elBody = ATON.UI.createContainer();
    for (let cc in ATON.CC.list){
        let CC = ATON.CC.list[cc];
        let elCC = ATON.UI.createContainer({ classes: "hathor-panel-section" });
        for (let e in CC){ elCC.append( ATON.UI.elem(`<div class='row'><div class='col-md-3'><strong>${e}</strong></div><div class='col-md-8'>${ATON.UI.URLifyToHTML(CC[e])}</div></div>`) ); }
        elBody.append(elCC);
    }
    ATON.UI.showModal({ header: "Copyrights / Metadata", body: elBody });
};

//====================================
// Tools Drawer Rewrite Section
//====================================
UI.sideTools = ()=>{
    let elBody = ATON.UI.createContainer();

    // --- 1. Measurement System ---
    let elMeasSection = ATON.UI.createContainer();
    elMeasSection.append(
        UI.createTextBlock("Add series of point-to-point measurements (AB)"),
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({
                    text: "Add AB measurements "+ UI.TASK_SYMBOL,
                    classes: "hathor-btn-task",
                    onpress: ()=>{
                        HATHOR.setCurrentTask(HATHOR.TASK_MEASURE_AB);
                        ATON.UI.setCursorStyle("crosshair");
                    }
                })
            ]
        }),
        UI.createBlockGroup({
            items:[
                ATON.UI.createButton({ text: "Clear all measurements", icon: "delete", classes: "btn-default", onpress: ()=>{ HATHOR.ED.removeMeasures(); } })
            ]
        })
    );

    // --- 2. Single Button Physics Controls Section (REVERTED BACK) ---
    let elPhysicsSection = ATON.UI.createContainer();
    
    let togglePhysicsBtn = ATON.UI.createButton({
        text: UI.physicsState.isPlaying ? "Pause Simulation" : "Resume Simulation",
        icon: UI.physicsState.isPlaying ? "bi-pause-fill" : "bi-play-fill",
        classes: "hathor-btn-task", 
        onpress: () => {
            // Toggle global playback tracking state
            UI.physicsState.isPlaying = !UI.physicsState.isPlaying;

            // Apply direct fallback clock multiplier factor to all captured mixers
            let targetSpeed = UI.physicsState.isPlaying ? 1.0 : 0.0;
            UI.physicsState.mixers.forEach(mixer => {
                if (mixer) mixer.timeScale = targetSpeed;
            });

            console.log(`[Physics Control] Toggled rendering timeScale state to: ${targetSpeed}`);

            // Update button visual text components
            if (UI.physicsState.isPlaying) {
                togglePhysicsBtn.querySelector(".aton-btn-text").innerText = "Pause Simulation";
            } else {
                togglePhysicsBtn.querySelector(".aton-btn-text").innerText = "Resume Simulation";
            }
        }
    });

    elPhysicsSection.append(
        UI.createTextBlock("Control physics animations within the global scene loop:"),
        UI.createBlockGroup({ items: [togglePhysicsBtn] })
    );

    // --- 3. Local HTML5 PDF Projector Input Section ---
    let elBoardSection = ATON.UI.createContainer();
    
    let htmlUploader = document.createElement('input');
    htmlUploader.type = 'file';
    htmlUploader.accept = 'application/pdf';
    htmlUploader.className = 'form-control aton-input-text';
    htmlUploader.style.marginBottom = '12px';

    htmlUploader.onchange = (e) => {
        let file = e.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = (event) => {
            UI.loadLocalPDFData(event.target.result);
        };
        reader.readAsArrayBuffer(file);
    };
    
    let btnPrev = ATON.UI.createButton({
        text: "Previous Slide",
        classes: "btn-default",
        onpress: () => {
            if (UI.pdfState.currentPage > 1) {
                UI.pdfState.currentPage--;
                UI.renderPDFPage(UI.pdfState.currentPage);
            }
        }
    });

    let btnNext = ATON.UI.createButton({
        text: "Next Slide",
        classes: "hathor-btn-task", 
        onpress: () => {
            if (UI.pdfState.currentPage < UI.pdfState.totalPages) {
                UI.pdfState.currentPage++;
                UI.renderPDFPage(UI.pdfState.currentPage);
            }
        }
    });

    elBoardSection.append(
        UI.createTextBlock("Select a local PDF file to slide-project onto the board:"),
        htmlUploader,
        UI.createBlockGroup({ items: [btnPrev, btnNext] })
    );

    // --- 4. Package Elements inside Collapsible Tree Accordions ---
    elBody.append(
        ATON.UI.createTreeGroup({
            items:[
                { title: "Measure Tools", open: false, content: elMeasSection },
                { title: "Physics Mechanics", open: false, content: elPhysicsSection },
                { title: "Presentation Board", open: true, content: elBoardSection }
            ]
        })
    );

    UI.highlightTBPanel(UI._elTools);
    
    UI.openToolPanel({
        header: "Tools Menu Container",
        body: elBody
    }); 
};

//====================================
// Collaborative chat & Help Prefabs
//====================================
UI.createChatContainer = ()=>{
    if (!UI._elPhotonChat) UI._elPhotonChat = ATON.UI.createContainer({ classes: "aton-photon-chat-container" });
    return UI._elPhotonChat;
};

UI.addMessage = (o)=>{
    if (!UI._elPhotonChat || !o.msg) return;
    let A = ATON.Photon.avatarList[o.uid];
    let elMSG = ATON.UI.elem(`<span class='aton-photon-msg'>${o.msg}</span>`);
    let elU = ATON.UI.createButton({ text: (o.uid !== ATON.Photon.uid)? A.getUsername() : "You", classes: "aton-btn-photon aton-photon-chat-user" });

    if (o.uid !== undefined){
        let strcol = ATON.Photon.ucolors[(o.uid % ATON.Photon.ucolors.length)].getStyle();
        elU.style["background-color"] = strcol;
    }
    elMSG.prepend( elU );
    UI._elPhotonChat.append(elMSG);
};

UI.sideCollab = ()=>{
    if (!ATON.Photon.isConnected()){ ATON.Photon.connect(); UI._elPhoton.setAttribute("disabled",true); return; }
    let elBody = ATON.UI.createContainer();
    let uname = ATON.Photon.getUsername();

    let elUname = ATON.UI.createInputText({
        placeholder: "Username", value: uname, classes: "w-100", clearonsub: false,
        validator: (u)=> u.length >= 3, onsubmit: (u)=>{ ATON.Photon.setUsername(u); }
    });

    elBody.append(
        UI.createTextBlock("Set a session nickname:"),
        UI.createBlockGroup({ items:[ elUname ] }),
        UI.createBlockGroup({ items:[ ATON.UI.createButton({ text: "Leave session", icon: "exit", classes: "btn-default aton-btn-block", onpress: ()=>{ ATON.Photon.disconnect(); UI.closeToolPanel(); } }) ] }),
        UI.createTextBlock("Exchange instant updates:"),
        UI.createChatContainer(),
        ATON.UI.createInputText({ placeholder: "Send message...", classes: "w-100", validator: (m)=> m.length >= 1, onsubmit: (m)=>{ ATON.Photon.setMessage(m); UI.addMessage({msg: m, uid: ATON.Photon.uid }); } })
    );

    UI.highlightTBPanel();
    UI.openToolPanel({ header: "Collaborative Session", body: elBody }); 
};

UI.modalHelp = ()=>{
    let elBody = ATON.UI.createContainer();
    let elNav = ATON.UI.createContainer();

    elNav.append( ATON.UI.elem(`<div><div class='row hathor-help-text'><div class='col-md-4' style='text-align:center'><img src='${ATON.UI.resolveIconURL("nav-orbit")}'></div><div class='col-md-8'><b>Orbit Mode</b>: target observation</div></div></div>`) );

    let elKeyb = ATON.UI.createContainer();
    elKeyb.append( ATON.UI.elem(`<div><div class='row hathor-help-text'><div class='col-md-6' style='text-align:center'><span class='hathor-shortcut'>t</span></div><div class='col-md-6'>Open Tools menu panel</div></div></div>`) );

    elBody.append( ATON.UI.createTabsGroup({ items:[ { title: "Navigation", content: elNav }, { title: "Shortcuts", content: elKeyb } ] }) )
    ATON.UI.showModal({ header: "Help Documentation", body: elBody });
};

UI.createTaskDescr = (text)=> ATON.UI.elem("<div class='hathor-task-descr'>"+text+"</div>");

UI.buildTaskToolbar = (task)=>{
    if (!task) return;
    UI._elTasks.innerHTML = ""; UI._elTasks.innerHTML = "";
    UI.hideMainElements();
    ATON.UI.showElement(UI._elTasks); ATON.UI.showElement(UI._elTasks);

    if (task === HATHOR.TASK_BASIC_ANN){
        let selRange = ATON.SUI.getSelectorRange();
        UI._elTasks.innerHTML = "Click surface location to add an annotation sphere.";
        UI._elTasks.append(
            ATON.UI.createButton({ text: "Cancel", icon: "bi-x-lg", classes: "btn-default", onpress: ()=>{ HATHOR.endCurrentTask(); UI.sideSemantics(); } }),
            ATON.UI.createContainer({ style: "display:inline-block;", items:[ ATON.UI.createSlider({ range: selRange, step: (selRange[1]-selRange[0]) * 0.01, value: ATON.SUI.getSelectorRadius(), oninput: (r)=>{ ATON.SUI.setSelectorRadius(r); } }) ] })
        );
    }
    if (task === HATHOR.TASK_MEASURE_AB){
        UI._elTasks.innerHTML = "Tap points to measure absolute linear distance segments.";
        UI._elTasks.append( ATON.UI.createButton({ text: "Done", icon: "bi-check-lg", classes: "btn-accent", onpress: ()=>{ HATHOR.endCurrentTask(); UI.sideTools(); } }) ); 
    }
};

UI.clearTaskToolbar = ()=>{
    UI._elTasks.innerHTML = ""; UI._elTasks.innerHTML = "";
    ATON.UI.hideElement(UI._elTasks); ATON.UI.hideElement(UI._elTasks);
    UI.showMainElements();
};

if (typeof HATHOR !== 'undefined') HATHOR.UI = UI;

export default UI;