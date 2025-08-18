async function loadTable() {
  try {
    // Use Zotero.DataDirectory for a safe, absolute path
    const filePath = Zotero.DataDirectory.dir + "/JournalAbbr.csv";
    Zotero.debug("Checking for JournalAbbr.csv at: " + filePath);
    let fileExists = false;
    try {
      fileExists = await IOUtils.exists(filePath);
    } catch (e) {
      Zotero.debug("IOUtils.exists error: " + e);
    }
    if (!fileExists) {
      Zotero.debug("JournalAbbr.csv not found, downloading from GitHub...");
      const response = await fetch("https://raw.githubusercontent.com/HuimingPan/ZoteroScript/refs/heads/main/JournalAbbr.csv");
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const fileContent = await response.text();
      try {
        await Zotero.File.putContentsAsync(filePath, fileContent);
        Zotero.debug("Downloaded and saved JournalAbbr.csv");
      } catch (e) {
        Zotero.debug("Error saving JournalAbbr.csv: " + e);
        throw e;
      }
    }

    let fileContent = "";
    try {
      fileContent = await Zotero.File.getContentsAsync(filePath);
      Zotero.debug("Loaded JournalAbbr.csv content");
    } catch (e) {
      Zotero.debug("Error reading JournalAbbr.csv: " + e);
      throw e;
    }
    const journalTable = new Map();
    const conferenceTable = new Map();
    const rows = fileContent.split('\n');

    for (const row of rows) {
      // Use a regular expression to match the CSV format, including quoted strings
      const match = row.match(/^(journal|conference),[ "]*([^"]*)"?,(.+)/);
      if (match) {
        const [_, type, key, value] = match;
        if (type && key && value) {
          if (type === 'journal') {
            journalTable.set(key.trim().toLowerCase(), value.trim());
          } else if (type === 'conference') {
            conferenceTable.set(key.trim().toLowerCase(), value.trim());
          }
        }
      }
    }

    return {
      journalTable,
      conferenceTable
    };
  } catch (error) {
    Zotero.debug("Error in loadTable: " + error);
    return {
      journalTable: new Map(),
      conferenceTable: new Map()
    };
  }
}

function FindJournalAbbr(journal, journalTable) {
  return journalTable.get(journal.trim().toLowerCase()) || "Unknown"; // Return "Unknown" if the journal is not found
}

function FindConferenceAbbr(conf, conferenceTable) {
  // Iterate through the conferenceTable to find an exact match
  for (let [fullTitle, abbreviation] of conferenceTable.entries()) {
    if (conf.trim().toLowerCase().includes(fullTitle)) {
      return abbreviation;
    }
  }
  return conf; // Return "Unknown" if the conference is not found
}



const {
  journalTable,
  conferenceTable
} = await loadTable();

if (item.isRegularItem() && !(item instanceof Zotero.Collection)) {
	if (item.itemType == 'journalArticle') {
		var journal = item.getField("publicationTitle");
		var abbr = FindJournalAbbr(journal, journalTable);
		if(abbr == "Unknown"){
			if(item.getField("journalAbbr"))
				abbr = item.getField("journalAbbr")
			else{
				abbr = journal
			}
		}
		item.setField("archive", abbr);
		
	} 

	else if (item.itemType == 'conferencePaper') {
		var proceedingsTitle = item.getField("proceedingsTitle");
		if (proceedingsTitle == "") {
		var proceedingsTitle = item.getField("conferenceName");
		}
		const yearPattern = /\b(19|20)\d{2}\b/g;
		var yearMatch = proceedingsTitle.match(yearPattern);
		var year = yearMatch ? yearMatch[0] : "000";

		var confAbbr = FindConferenceAbbr(proceedingsTitle, conferenceTable);
		var abbr = confAbbr + year;

		item.setField("archive", abbr);
	}

	else if (item.itemType == 'preprint'){
		item.setField("archive", 'Preprint');
	}
	else if (item.itemType == 'book' || item.itemType == 'bookSection' ){
		abbr = item.getField("publisher");
		item.setField("archive", abbr);
	}
	else{
		item.setField("archive", "Unknown");
	}
}


