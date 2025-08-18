async function loadTable(path) {
  try {
    const fileContent = await Zotero.File.getContentsAsync(path);
    const journalTable = new Map();
    const conferenceTable = new Map();
    const rows = fileContent.split('\n');

    for (const row of rows) {
      // Use a regular expression to match the CSV format, including quoted strings
      const match = row.match(/^(journal|conference),[ "]*([^"]*)"?,(.+)/);
//       console.log(match)
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
    Zotero.debug("Error reading file: " + error);
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


const path = "D:\\NutStore\\Zotero\\插件配置\\JournalAbbr.csv";
const {
  journalTable,
  conferenceTable
} = await loadTable(path);

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


