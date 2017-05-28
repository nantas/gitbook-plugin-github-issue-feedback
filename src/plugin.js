var path = require("path");
var BugReporter = require("./BugReporter");
var findAllPositions = require("position-map-text-to-markdown").findAllPositions;

function quoteText(text) {
    return text.split("\n").map(function(line) {
        return "> " + line;
    }).join("\n");
}

function getContentAsync(apiURL) {
    // https://github.com/jser/jser.info/edit/gh-pages/data/2015/08/index.json
    // => https://api.github.com/repos/jser/jser.info/contents/data/2015/08/index.json
    return fetch(apiURL).then(function(response) {
        return response.json();
    }).then(function(response) {
        return decodeURIComponent(escape(atob(response.content)));
    });
}

function getResourceURL(config, filePath, branch) {
    if (config["markdownBaseURL"]) {
        return path.join(config["markdownBaseURL"], filePath);
    }
    return `https://github.com/${config.repo}/blob/${branch}/${filePath}`
}

function getEditURL(config, filePath, branch) {
    return `https://github.com/${config.repo}/edit/${branch}/${filePath}`
}
function getAPIURL(config, filePath) {
    if (config["githubAPIBaseURL"]) {
        return path.join(config["githubAPIBaseURL"], filePath);
    }
    return `https://api.github.com/repos/${config.repo}/contents/${filePath}`;
}

function getIssueURL(config) {
    if (config["newIssueURL"]) {
        return config["newIssueURL"];
    }
    return `https://github.com/${config.repo}/issues/new`
}
window.require(["gitbook"], function(gitbook) {
    // plugin config
    gitbook.events.bind("start", function(e, pluginConfig) {
        var config = pluginConfig["github-issue-feedback"];
        var reportElement = document.createElement("button");
        reportElement.textContent = "Bug Report";
        reportElement.className = "gitbook-plugin-github-issue-feedback";
        reportElement.setAttribute("style", "position:fixed; right:0;bottom:0;");
        var clickEvent = ("ontouchstart" in window) ? "touchend" : "click";
        reportElement.addEventListener(clickEvent, function(event) {
            var apiURL = getAPIURL(config, gitbook.state.filepath);
            var resourceURL = getResourceURL(config, gitbook.state.filepath, "master");
            var editURL = getEditURL(config, gitbook.state.filepath, "master");
            getContentAsync(apiURL).then(function(markdown) {
                var bug = new BugReporter(getIssueURL(config));
                var selectedText = bug.getSelectedText().trim();
                let body = 'URL : ' + resourceURL + "\n\n";
                if (selectedText && selectedText.length > 0) {
                    var matches = findAllPositions({
                        text: selectedText,
                        markdown: markdown
                    });
                    console.log(matches);
                    matches.forEach(function(match) {
                        var editLink = `[:memo:](${editURL}#L${match.loc.start.line} "Edit")`;
                        body += quoteText(match.markdown + "\n" +
                                `${editLink} <${resourceURL}#L${match.loc.start.line}>`) + "\n";
                    });
                }
                bug.setBody(body);
                bug.report();
            });
        });
        document.body.appendChild(reportElement);
    });

});