let foundItems = []; // Tableau pour les items trouvés
let notFoundItems = []; // Tableau pour les items non trouvés
let itemsList = []; // Nouvelle variable pour garder trace de tous les items

// Lire le fichier CSV
function processCSV() {
    const fileInput = document.getElementById('csvFileInput');
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(',')); // Séparer les lignes et les colonnes

        // Prendre uniquement les lignes à partir de la 8ème (index 7)
        const items = rows.slice(7); 
        displayItems(items); // Afficher les items
    };

    reader.readAsText(fileInput.files[0]);
}

// Afficher la liste des items dans un tableau
function displayItems(items) {
    const list = document.getElementById('itemList');
    list.innerHTML = ''; // Réinitialiser la liste
    itemsList = []; // Réinitialiser la liste d'items

    // Vérifier si le tableau est vide
    if (items.length === 0) {
        list.innerHTML = '<tr><td colspan="5">Aucun item trouvé.</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        
        // Créer les cellules pour chaque colonne
        row.innerHTML = `
            <td>${item[0]}</td> <!-- Code-barres -->
            <td>${item[1]}</td> <!-- Colonne 2 -->
            <td>${item[11]}</td> <!-- Colonne 12 -->
            <td>${item[3]}</td> <!-- Colonne 4 -->
            <td>${item[2]}</td> <!-- Colonne 3 -->
        `;
        row.setAttribute('data-code', item[0]); // Le code-barres est dans la première colonne
        list.appendChild(row);

        // Ajoute l'item à la liste des items
        itemsList.push({
            code: item[0],
            description: item[2],
            scanned: false // Initialement non scanné
        });
    });
}

// Fonction pour vérifier les items manuellement
function manualCheck() {
    const manualCode = document.getElementById('manualCodeInput').value.trim();
    checkItem(manualCode);
}

// Démarrer le scan des codes-barres
Quagga.init({
    inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#scanner')
    },
    decoder: {
        readers: ["code_128_reader", "ean_reader"] // types de codes-barres supportés
    }
}, function(err) {
    if (err) {
        console.error(err);
        return;
    }
    Quagga.start();
});

// À la détection d'un code-barres
Quagga.onDetected(function(data) {
    const scannedCode = data.codeResult.code;
    checkItem(scannedCode);
});

// Vérifie si le code scanné correspond à un item dans la liste
function checkItem(scannedCode) {
    const items = document.querySelectorAll('#itemList tr');
    let found = false;

    items.forEach(item => {
        if (item.getAttribute('data-code') === scannedCode) {
            item.classList.add('scanned'); // Marquer l'item comme scanné
            found = true;
            // Met à jour la liste des items trouvés
            const itemDetails = itemsList.find(i => i.code === scannedCode);
            if (itemDetails) {
                itemDetails.scanned = true;
                foundItems.push(itemDetails);
            }
        }
    });

    if (!found) {
        alert("Item non trouvé dans la liste.");
    }

    // Met à jour la liste des items non trouvés
    notFoundItems = itemsList.filter(item => !item.scanned);
}

// Téléchargement des rapports
async function downloadSummary(status) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('portrait', 'pt', 'letter'); // Format 8.5x11 pouces

    // Titre du rapport
    pdf.setFontSize(16);
    pdf.text(`Rapport des items ${status === 'found' ? 'trouvés' : 'non trouvés'}`, 10, 20);

    // En-têtes du tableau
    pdf.setFontSize(12);
    const startY = 40; // Position Y de départ pour le tableau
    const rowHeight = 15; // Hauteur de ligne
    const columnWidth = [100, 200]; // Largeurs des colonnes

    // En-têtes
    pdf.text("Code-barres", 10, startY);
    pdf.text("Description", columnWidth[0] + 10, startY);
    pdf.line(10, startY + 5, 10 + columnWidth[0] + columnWidth[1], startY + 5); // Ligne de séparation

    // Remplir le tableau avec les données
    let yPosition = startY + rowHeight; // Position Y pour les données
    const margin = 10; // Marge

    const dataToDisplay = status === 'found' ? foundItems : notFoundItems;

    dataToDisplay.forEach((item, index) => {
        // Ajouter une nouvelle page si nécessaire
        if (yPosition > pdf.internal.pageSize.height - margin) {
            pdf.addPage(); // Ajouter une nouvelle page
            // Redessiner les en-têtes sur chaque page
            pdf.text("Code-barres", 10, 20);
            pdf.text("Description", columnWidth[0] + 10, 20);
            pdf.line(10, 25, 10 + columnWidth[0] + columnWidth[1], 25);
            yPosition = 40; // Réinitialiser la position Y
        }

        // Afficher les données dans les colonnes
        pdf.text(item.code, 10, yPosition);
        pdf.text(item.description, columnWidth[0] + 10, yPosition);
        yPosition += rowHeight; // Avancer à la ligne suivante
    });

    // Télécharger le PDF
    pdf.save(`rapport_items_${status === 'found' ? 'trouvés' : 'non_trouvés'}.pdf`);
}