var API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json";

var activeQueries = 0;
var maxActiveQueries = 1000;

function Article(name) {
	this.name = name;
	this.incoming = [];
}

Article.prototype.collectLinks = function(callback) {
	queryAdjacentArticles(this, callback);
};

Article.prototype.printIncomingArticleNames = function(argument) {
	this.incoming.forEach((article, i, arr) => console.log((i + 1) + " / " + arr.length + ": " + article.name));
};

Article.prototype.printIncomingArticleCount = function() {
	console.log(this.incoming.length + " articles link to: " + this.name + ".");
};

Article.prototype.intersects = function(article) {
	this.incoming.forEach((incoming) => {
		if (article.name === incoming.name) {
			return true;
		}
	});
	return false;
}

function queryWikipedia(article, property, params, callback) {
	activeQueries++;
	var url = API_URL + "&titles=" + encodeURIComponent(article) + "&prop=" + encodeURIComponent(property);
	for (var i = 0; i < params.length; ++i) {
		url += "&" + encodeURIComponent(params[i][0]) + "=" + encodeURIComponent(params[i][1]);
	}
	jsonp(url, (json) => {
		--activeQueries;
		callback(json);
	});
}

function queryAdjacentArticles(article, callback, continuation) {
	if (!continuation) {
		article.incoming = [];
		//console.log("Querying articles that link to article: '" + article.name + "'...");
	}

	queryWikipedia(article.name, "linkshere", [
		["lhprop", "title"],
		["lhshow", "!redirect"],
		["lhlimit", 500],
		["lhnamespace", 0],
		["lhcontinue", continuation ? continuation["lhcontinue"] : 0],
	], (json) => onQueryResult(json, article, callback));
}

function onQueryResult(json, article, callback) {
	if (json) {
		var result = json["query"];

		// Query result is not empty.
		if (result) {
			var links = result["pages"];
			links = links[Object.keys(links)[0]];
			links = links["linkshere"];

			// Links were found.
			if (links) {
				links.map((link) => {
					if (link && article.incoming.indexOf(link) === -1)
						article.incoming.push(new Article(link["title"]));
				});

				var continuation = json["continue"];
				if (continuation) {
					queryAdjacentArticles(article, callback, continuation);
				} else {
					callback(article);
				}
			}
		}
	}
}

document.getElementById("search").addEventListener("click", function() {

	var src_article_name = document.getElementById("src").value;
	var dst_article_name = document.getElementById("dst").value;
	var articles = [new Article(src_article_name), new Article(dst_article_name)];

	var left_table = document.getElementById("left");
	var right_table = document.getElementById("right");

	// Validate input.
	if (src_article_name && dst_article_name && articles[0] && articles[1]) {
		var from_src_completed = false;
		var from_dst_completed = false;

		// Query layer one of src article.
		articles[0].collectLinks(() => {
			articles[0].printIncomingArticleCount();

			// Display layer one articles in left table.
			articles[0].incoming.forEach((incoming) => {
				left_table.insertRow(-1).insertCell(0).innerHTML = incoming.name;
			});

			// Query layer one of dst article.
			articles[1].collectLinks(() => {
				articles[1].printIncomingArticleCount();

				// Display layer one articles in right table.
				articles[1].incoming.forEach((incoming) => {
					right_table.insertRow(-1).insertCell(0).innerHTML = incoming.name;
				});

				// Check layer one intersection.
				var intersection = null;
				for (var i = 0; i < articles[0].incoming; ++i) {
					if (articles[0].incoming[i].intersects(articles[1])) {
						intersection = [articles[0].incoming[i], articles[1]];
						return false;
					}
				}

				if (!intersection) {
					// Query layer two of src article.
					articles[0].incoming.forEach((incoming0) => {
						incoming0.collectLinks(() => {
							incoming0.printIncomingArticleCount();
						});
					});

					// Query layer two of dst article.
					articles[1].incoming.forEach((incoming1) => {
						incoming1.collectLinks(() => {
							incoming1.printIncomingArticleCount();
						});
					});
				} else {
					console.log("Intersection on layer one between articles " + intersection[0].name + " and " + intersection[1].name + ".");
				}
			});
		});
	} else {
		throw ("Please enter two valid articles.");
	}
});