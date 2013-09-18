
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3030);
//app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);



//http.createServer(app).listen(app.get('port'), function(){
//  console.log('Express server listening on port ' + app.get('port'));
//});

var io = require('socket.io').listen(app.listen(app.get('port')));
var g = new Game(0);

io.sockets.on('connection', function (socket) {
	console.log("socket connected: " + socket.id);
	g.clients[socket.id] = {name: "player" + g.num_clients++};
	if (g.num_players < g.max_players) {
		g.num_players++;
		// set up a new player
		g.players[socket.id] = new Player(socket.id);
		g.players[socket.id].name = g.clients[socket.id].name;
		g.players[socket.id].disconnected = false;

		if (g.num_players >= g.min_players && g.game_started == false)
		{
			if(g.timeout) {
				console.log(socket.id + ": Timeout is already set, game will start soon.");
				socket.emit("alert", {message: "Game will start soon."});
			} else {
				console.log("Game will start in 15 seconds.");
				socket.emit("alert", {message: "Game will start in 15 seconds."});

				g.timeout = setInterval(startGame, 15000);
			}

			// start the game
			//setupGame();
		}
	}

	//socket.emit('alert', {message: 'welcome to the game ' + g.clients[socket.id].name});

	//socket.on('startgame', onStartGame);
	//socket.on('choose_role', onChooseRole);
	socket.on('disconnect', onDisconnect );
	socket.on('update', onUpdate );
	socket.on('callBet', onCallBet );
	socket.on('foldHand', onFoldHand );
});

function startGame() {
	clearInterval(g.timeout);
	setupGame();
	g.timeout = null;
}

function findNextPlayer() {

	var next_player = "";
	var found_current_player = 0;
	var i = 0;
	var l = g.player_order.length;

	while (found_current_player < 2 && next_player == "") {
		if (g.player_order[i] == g.player_turn) {
			found_current_player++;
		} else {
			if (found_current_player == 1) {
				// found the current player, now look for the next player that can act
				if (g.players[ g.player_order[i] ].status != "fold" && g.players[ g.player_order[i] ].status != "call" && g.players[ g.player_order[i] ].status != "all in" ) {
					next_player = g.player_order[i];
				}
			}
		}
		i = i + 1;
		i = i % l;
	}
	return next_player;

}

function onFoldHand() {

	console.log(g.clients[this.id].name + " is trying to fold his hand.");
	if (this.id == g.player_turn) {
		g.players[this.id].status = "fold";
	}
	// find next player to act

}
function onCallBet() {

	console.log(g.clients[this.id].name + " is trying to call the bet.");
	if (this.id == g.player_turn) {
		console.log("It is " + g.clients[this.id].name + "'s turn to act.");
		console.log("The required bet is " + g.required_bet);
		console.log( g.clients[this.id].name + "'s current bet is " + g.players[this.id].bet);
		console.log( g.clients[this.id].name + " has " + g.players[this.id].money);
		if ( g.players[this.id].money > (g.required_bet - g.players[this.id].bet)) {
			g.players[this.id].money -= (g.required_bet - g.players[this.id].bet);
			g.players[this.id].bet += (g.required_bet - g.players[this.id].bet);
			console.log( g.clients[this.id].name + " has called the bet.");
			g.players[this.id].status = "call";
		} else {
			// player is calling all in.
			g.players[this.id].bet += (g.players[this.id].money);
			g.players[this.id].money = 0;
			console.log( g.clients[this.id].name + " has called ALL IN.");
			g.players[this.id].status = "all in";
		}
		console.log( g.clients[this.id].name + "'s current bet is now " + g.players[this.id].bet);
		console.log( g.clients[this.id].name + " now has " + g.players[this.id].money);

		// find next player to act
		var next_player_to_act = findNextPlayer();
		if (next_player_to_act == "") {
			// next stage. 
			// do the flop, or the turn, or the river, or showdown 
			
			//then find the next player starting with the player after the dealer.
			// the next player is the next player after the dealer who has not already folded and is not all in
			// if there is only one player, then go to the next stage, because nobody can call a bet anyway

		} else {
			console.log("Next player is " + g.players[ next_player_to_act ].name );
			g.player_turn = next_player_to_act;
		}


	} else {
		console.log("It is not " + g.clients[this.id].name + "'s turn to act.");
	}

}

function onUpdate() {
	console.log("Sending " + g.clients[this.id].name + " a game update.");
	this.emit('update', {game_state: g, my_id: this.id});
	console.log("Sent an update to " + g.clients[this.id].name);

}

function Game(id){
	this.id = id;
	this.dealer = "";
	this.pots = [];
	this.players = {};
	this.clients = {};
	this.num_clients = 0;
	this.num_players = 0;
	this.max_players = 3;
	this.min_players = 2;
	this.active_players = 0;
	this.player_order = [];
	this.game_started = false;
	this.status = 'Waiting for players';
}

function Player(id){
	this.id = id;
	this.isDealer = false;
	this.money = 0;
	this.disconnected = true;
	this.allin = false;
}

// this function is called one time to set up the tournament
function setupGame(){
	g.action = "initializing game";
	g.player_order = [];
	
	// not sure if i need this
	g.active_players = 0;

	for (p in g.players){
		g.players[p].money = 100;
		g.player_order.push(p);
		g.active_players++;
		g.players[p].next = -1;
		g.players[p].isDealer = false;
	}

	//shuffle the player order
	fisherYates(g.player_order);

	for (p in g.player_order) {
		g.players[g.player_order[p]].order = p
	}

	// have each player point to the next player and the previous player
	createPlayerLinks();

	g.round = 0;
	g.action = "";

	g.dealer = g.player_order[0]; // the dealer is the first player in the player_order array
	if (g.num_players == 2) {
		g.small_blind_player = g.player_order[0];
		g.big_blind_player = g.player_order[1];
	} else {
		g.small_blind_player = g.player_order[1];
		g.big_blind_player = g.player_order[2];
	}

	g.players[g.dealer].isDealer = true;

	// initial big blind value
	g.small_blind = 50;
	g.big_blind = 100;
	g.min_bet = g.big_blind;
	g.game_started = true;

	resetGame(); // set up the first hand
}

function moveDealerButton() {
	// this function moves the dealer button
	// and moves the small blind and big blind
	// actually you need to figure out who the next big blind is
	// the next big blind is the first player that still has money
	// after the current big blind
	// then, if the current big blind still has money, then he is the next small blind
	// then, the dealer button should sit to the left of the small blind, 
	// even if there is no player in that seat

	var next_bb = "";
	var found_current = 0;
	var i = 0;
	var l = g.player_order.length;
	while (found_current < 2 && next_bb == "") {
		if (g.player_order[i] == g.big_blind_player) {
			found_current++;
		} else {
			if (found_current == 1) {
				// found the current bb, now look for the next player that can be bb
				if (g.players[ g.player_order[i] ].money > 0) {
					next_bb = g.player_order[i];
				}
			}
		}
		i = i + 1;
		i = i % l;
	}
	// move the dealer button to the position to the right of the current big blind
	if (g.players[ g.big_blind_player].order == 0) {
		g.dealer = g.player_order[ g.player_order.length -1 ];
	} else {
		g.dealer = g.player_order[ g.players[ g.big_blind_player].order -1 ];
	}

	// move the small blind to the current big blind if he has money
	if (g.players[ g.big_blind_player].money > 0) {
		g.small_blind_player = g.big_blind_player;
	} else {
		g.small_blind_player = "";
	}

	g.big_blind_player = next_bb;
}

// this function gets called at the beginning of every hand
function resetGame(){

	//initialize the pots
	g.pots = [];

	// set up the main pot for this hand
	g.pots[0] = 0;

	g.required_bet = g.big_blind;

	g.cards = [];
	suits = ['S','H','D','C'];
	ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
	// create the deck
	for (suit in suits) {
		for (rank in ranks){
			g.cards.push(ranks[rank] + suits[suit]);
		}
	}	
	// shuffle the cards
	//g.cards.sort(function() {return 0.5 - Math.random()});
	//console.log("Deck before shuffle:");
	//console.log(g.cards);
	fisherYates(g.cards);
	//console.log("Deck after shuffle:");
	//console.log(g.cards);

	g.active_players = 0; // count how many players we start the hand with
	//for (p in g.player_order) {
	//	if (g.players[g.player_order[p]].money > 0) {
	//		g.active_players++;
	//	} else {
	//		g.players[g.players[g.player_order[p]].previous].next = g.players[g.player_order[p]].next;
	//	}
	//}

	for (p in g.players){
		g.players[p].bet = 0;
		g.players[p].status = "";
		g.players[p].cards = [];

		// all you need is a chip and a chair
		// anybody that still has money gets dealt two cards
		if (g.players[p].money > 0) {
			g.players[p].cards.push(g.cards.shift());
			g.players[p].cards.push(g.cards.shift());
			g.active_players++;
		} else {
			g.players[p].status = "busted";
		}
	}
	
	g.board = [];
	g.burn = [];

	// player turn
	// 2 players dealer is small blind and has to call or fold or raise
	// 3 or more players the player after big blind has to call or fold or raise (in 3 player games this is the dealer)
	
	// post the blinds	
	if (g.active_players < 3)
	{
		// two players - dealer is small blind
		// the small blind must post the small blind or the rest of his money, whichever is smaller
		g.players[g.dealer].bet = Math.min(g.small_blind, g.players[g.dealer].money);

		g.players[g.dealer].status = "small blind";
		g.players[g.dealer].money -= g.players[g.dealer].bet;
		if (g.players[g.dealer].money == 0) {
			g.players[g.dealer].allin = true;
			g.players[g.dealer].status = "all in";

		}

		g.pots[0]+= g.players[g.dealer].bet;

		// the big blind must post the big blind or the rest of his money, whichever is smaller
		g.players[g.players[g.dealer].next].bet = Math.min( g.big_blind, g.players[ g.players[g.dealer].next].money);
		g.players[g.players[g.dealer].next].status = "big blind";
		g.players[g.players[g.dealer].next].money -= g.players[g.players[g.dealer].next].bet;
		if (g.players[g.players[g.dealer].next].money == 0) {
			g.players[g.players[g.dealer].next].allin = true;
			g.players[g.players[g.dealer].next].status = "all in";
		}
		g.pots[0] +=  g.players[g.players[g.dealer].next].bet;
		
	} else
	{
		g.players[g.players[g.dealer].next].bet = Math.min(g.small_blind, g.players[g.players[g.dealer].next].money);
		g.players[g.players[g.dealer].next].status = "small blind";
		g.players[g.players[g.dealer].next].money -= g.players[g.players[g.dealer].next].bet;
		if (g.players[g.players[g.dealer].next].money == 0) {
			g.players[g.players[g.dealer].next].allin = true;
			g.players[g.players[g.dealer].next].status = "all in";

		}
		g.pots[0] += g.players[g.players[g.dealer].next].bet;
		
		g.players[g.players[g.players[g.dealer].next].next].bet = Math.min(g.big_blind, g.players[g.players[g.players[g.dealer].next].next].money);
		
		g.players[g.players[g.players[g.dealer].next].next].status = "big blind";
		g.players[g.players[g.players[g.dealer].next].next].money-= g.players[g.players[g.players[g.dealer].next].next].bet;
		if (g.players[g.players[g.players[g.dealer].next].next].money == 0) {
			g.players[g.players[g.players[g.dealer].next].next].allin = true;
			g.players[g.players[g.players[g.dealer].next].next].status = "all in";

		}
		g.pots[0] += g.players[g.players[g.players[g.dealer].next].next].bet;
	}

	g.status = "pre-flop";
	// need to find the next player.  if there are only two players and they are both all in 
	// in the blinds then really it is nobody else's turn.

	

//	g.player_turn = g.players[ g.players[ g.dealer ].next ].next;

}

function fisherYates ( myArray ) {
	var i = myArray.length;
	if ( i == 0 ) return false;
	while ( --i ) {
		var j = Math.floor( Math.random() * ( i + 1 ) );
		var tempi = myArray[i];
		var tempj = myArray[j];
		myArray[i] = tempj;
		myArray[j] = tempi;
	}
}

function onDisconnect () {
	console.log(g.players[this.id].name + " disconnected.");
	g.players[this.id].disconnected = true;
}

function checkGameOver() {
	var players_with_money = 0;

	for (p in g.players) {
		if (g.players[p].money > 0) {
			players_with_money++;
		}
	}
	return (players_with_money < 2);
}
function removeBrokePlayers() {
	var new_player_order = [];

	for (p in g.player_order) {
		if (g.players[ g.player_order[p] ].money > 0) {
			new_player_order.push(g.player_order[p]);
		} else {
			delete g.players[g.player_order[p]];
		}
	}
	g.player_order = new_player_order;

}

function createPlayerLinks () {

	// have each player point to the next player and the previous player
	while(g.players[g.player_order[0]].next == -1)
	{
		p = g.player_order.shift(); // take player off the front of the player_order array
		g.players[p].next = g.player_order[0]; // point the player to the next player
		g.players[g.player_order[0]].previous = p; // point the next player back to this one
		g.player_order.push(p); // put the player on the end of the array
	}

}


/*

Game steps

players join game then
setup game - initialize game variables
reset game - for poker means shuffle deck, post blinds, deal cards etc
pre-flop - players bet
flop - deal 3 community cards, players bet, if all players fold then skip to pay the winners
turn - deal 1 community card, players bet, if all players fold then skip to pay the winners
river - deal 1 community card, players bet, if all players fold then skip to pay the winners
showdown - show the cards
payout - pay the winners
check for game over - if all players except one are broke then game over, if game over then go to setup game
if game is not over then move the dealer button - go to reset game




*/
