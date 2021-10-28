class TreeNode{
    constructor(name, prescendants, dependsOn, description) {
        this.name = name;
        this.alias = "TREE_NODE_" + TREE_COUNTER;
        this.description = description;
        this.editDescription();
        TREE_COUNTER += 1;
        this.descendants = {
            "Succeeded": new Set(),
            "Completed": new Set(),
            "Skipped": new Set(),
            "Failed": new Set()
        };
        this.dependsOn = dependsOn;
        this.prescendants = prescendants;
        this.visited = 0;
        this.size = 0;
        this.addedToTree = 0;
        this.timesToBeAdded = Math.max(1, prescendants);
    }

    getName(){
        return this.name;
    }
    
    getAlias(){
        return this.alias;
    }

    getDescendants(){
        return this.descendants;
    }

    getDependsOn(){
        return this.dependsOn;
    }

    getDependsOnAmmount(){
        return this.dependsOn.length;
    }

    getDescendantsAmmount(){
        let sum = 0;
        for (let k in this.descendants) {
            sum += this.descendants[k].size;
        }
        return sum;
    }

    editDescription(){
        if (!this.description) return;

        let newDesctiption = "";
        let descriptionWords = this.description.split(' ');
        let lineLen = 0;
        
        for (let i = 0; i < descriptionWords.length; i++) {
            let word = descriptionWords[i];
            newDesctiption = newDesctiption + word;
            lineLen = lineLen + word.length;
            if (lineLen > MAX_LINE_LEN){
                lineLen = 0;
                newDesctiption = newDesctiption + "\n";
            }
            else{
                newDesctiption = newDesctiption + " ";
            }
        }
        this.description = newDesctiption;
    }

    addDescendants(lines){
        for (let k in this.descendants) {
            for (let item of this.descendants[k]){
                item.addLines(lines);
            }
        }
    }

    addLinesActivity(lines){
        // Legacy, now uses state diagram
        this.visited += 1;
        if (this.visited < this.prescendants){
            lines.push("split again");
            return;
        }
        if (this.prescendants > 1){
            lines.push("end split");
        }
        lines.push(":" + this.name + ";");
        if (this.getDescendantsAmmount() == 1){
            this.addDescendants(lines);
        }
        else if (this.getDescendantsAmmount() >= 2){
            lines.push("split");
            this.addDescendants(lines);
        }
        else if (this.getDescendantsAmmount() == 0){
            return;
        }
    }

    addDescendantsStates(lines){
        let useName = this.alias;
        if (this.name == START_NODE_NAME){
            useName = this.name;
        }
        else{
            let stateNameString = 'state "' + this.name + '" as ' + useName;
            lines.push(stateNameString);
            if (this.description){
                let descriptionLines = this.description.split("\n");
                for (let i in descriptionLines){
                    lines.push(useName + " : " + descriptionLines[i]);
                }
            }
        }
        
        for (let k in this.descendants) {
            for (let item of this.descendants[k]){
                let lineColor = "-[" + LINE_COLORS[k] + ",bold]->";
                let statesString = useName + lineColor + item.getAlias();
                lines.push(statesString);
            }
        }
    }

    addNode(newNode){
        /*
        for (let k in this.descendants) {
            for (let item of this.descendants[k]){
                item.addNode(newNode);
            }
        }
        */
        
        let dependsOn = newNode.getDependsOn();
        let d = dependsOn.length;

        for (let i = 0; i < d; i++){
            if (dependsOn[i].activity == this.name){
                let conditions = dependsOn[i].dependencyConditions;
                for (let j = 0; j < conditions.length; j++){
                    if (newNode in this.descendants[conditions[j]]){
                        continue;
                    }
                    else{
                        if (newNode.name == "FilterFact"){
                            console.log(this.name);
                        }
                        this.descendants[conditions[j]].add(newNode);
                    }
                }
            }
        }
    }
}

var LINE_COLORS = {
    "Succeeded": "#green",
    "Completed": "#blue",
    "Skipped": "#grey",
    "Failed": "#red"
};
var MAX_LINE_LEN = 50;
var START_NODE_NAME = "[*]";
var TREE_COUNTER = 0;

function readSingleFile() {
    
    var file = document.getElementById("file-input").files[0];
    console.log(file);
    if (!file) {
      return;
    }
    var reader = new FileReader();
    
    reader.onload = function(e) {
        var contents = e.target.result;
        createDiagram(contents);
    };
    reader.readAsText(file);
}

function readCode(){
    let code = document.getElementById("code-input").value;
    createDiagram(code);
}
  
function displayContents(contents) {
    var element = document.getElementById('diagram-link');
    var img = document.getElementById('diagram-img');
    element.textContent = "PlantUML Link";
    element.href = createLink(contents);
    img.src = createImage(contents);
}

function createDiagram(contents){
    let activitiesList = createTrees(contents);
    let compresedCode = createCompresedCode(activitiesList);

    displayContents(compresedCode);
}

document.getElementById("load-file").addEventListener("click", readSingleFile);
document.getElementById("load-code").addEventListener("click", readCode);

function createTrees(code){
    const obj = JSON.parse(code);
    var name = obj.name;
    let activitiesList = [];
    var activities = obj.properties.activities;
    activitiesList.push(new TreeNode(START_NODE_NAME, 0, []))
    for (let i in activities) {
        let activity = activities[i];
        if (activity.dependsOn.length == 0){
            activity.dependsOn = [
                {
                    "activity": START_NODE_NAME,
                    "dependencyConditions": [
                        "Completed"
                    ]
                }
            ]
        }
        activitiesList.push(new TreeNode(activity.name, activity.dependsOn.length,
                                        activity.dependsOn, activity.description));
    }
    var tree;
    let n = 0;
    for (let i in activitiesList) {
        for (let j in activitiesList) {
            let treeNode1 = activitiesList[i];
            let treeNode2 = activitiesList[j];
            if (treeNode1.getDependsOnAmmount() == 0){
                tree = treeNode1;
            }
            
            treeNode2.addNode(treeNode1);
        }
    }
    return activitiesList;
}

function addLinesState(activities){
    lines = [];
    lines.push("@startuml");
    lines.push("!theme cerulean");
    for (let i in activities){
        let activity = activities[i];
        activity.addDescendantsStates(lines);
    }
    lines.push("@enduml");
    let codeString = "";
    for (let i in lines){
        codeString = codeString + lines[i] + "\n";
    }
    return codeString;
}

function createCompresedCode(activitiesList){
    return compress(addLinesState(activitiesList));
}
