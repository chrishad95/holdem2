
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
var timeout;
var sockets = {};

io.sockets.on('connection', function (socket) {
	sockets[socket.id] = socket;

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
			if(timeout) {
				console.log(socket.id + ": Timeout is already set, game will start soon.");
				socket.emit("alert", {message: "Game will start soon."});
			} else {
				console.log("Game will start in 15 seconds.");
				socket.emit("alert", {message: "Game will start in 15 seconds."});

				timeout = setInterval(startGame, 15000);
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
	console.log("Starting the game.");
	clearInterval(timeout);
	setupGame();
	timeout = null;
}

function findNextPlayer(player_id) {
	// the next player we are looking for
	// is the player after the current player that has money
	// and has not called the current bet or folded yet.
	// and is not disconnected

	console.log("Looking for the first player after: " + player_id);


	var next_player = "";
	var i = 0;
	var l = g.player_order.length;
	var player_idx = 0;

	// loop thru the players, starting with the player after the current player
	for (i = 0; i < l; i++) {

		// adjust to start at the current player
		// i.e. 0 + current_player = current_player
		player_idx = (i + g.players[player_id].order + 1) % l;

		console.log("i=" + i);
		if (g.players[ g.player_order[ player_idx ]].money > 0 
			&& g.players[ g.player_order[ player_idx]].status != "fold" 
			&& g.players[ g.player_order[player_idx]].bet < g.required_bet
			) {
			if (g.players[ g.player_order[player_idx]].disconnected) {
				// would be this players turn to bet but he is disconnected so fold
				g.players[ g.player_order[ player_idx]].status = "fold";
			} else {
				next_player = g.player_order[ player_idx ];
				break;
			}
		}
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
		console.log("It is " + g.players[this.id].name + "'s turn to act.");
		console.log("The required bet is " + g.required_bet);
		console.log( g.players[this.id].name + "'s current bet is " + g.players[this.id].bet);
		console.log( g.players[this.id].name + " has " + g.players[this.id].money);
		if ( g.players[this.id].money > (g.required_bet - g.players[this.id].bet)) {
			g.players[this.id].money -= (g.required_bet - g.players[this.id].bet);
			g.players[this.id].bet += (g.required_bet - g.players[this.id].bet);
			console.log( g.players[this.id].name + " has called the bet.");
			g.players[this.id].status = "call";
		} else {
			// player is calling all in.
			g.players[this.id].bet += (g.players[this.id].money);
			g.players[this.id].money = 0;
			console.log( g.players[this.id].name + " has called ALL IN.");
			g.players[this.id].status = "all in";
		}
		console.log( g.players[this.id].name + "'s current bet is now " + g.players[this.id].bet);
		console.log( g.players[this.id].name + " now has " + g.players[this.id].money);

		// find next player to act
		var next_player_to_act = findNextPlayer(g.player_turn);

		if (next_player_to_act == "") {
			console.log("Could not find next player. Go to the flop.");
			g.player_turn = "";
			if (g.status == "pre-flop") {
				doFlop();
			}

			// next stage. 
			// do the flop, or the turn, or the river, or showdown 
			
			//then find the next player starting with the player after the dealer.
			// the next player is the next player after the dealer who has not already folded and is not all in
			// if there is only one player, then go to the next stage, because nobody can call a bet anyway

		} else {
			console.log("Next player is " + g.players[ next_player_to_act ].name );
			g.player_turn = next_player_to_act;
		}
	
		// send all players a game update.  This may go in a function.
		sendUpdates();
	


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
	//createPlayerLinks();

	g.round = 0;
	g.action = "";

	g.dealer = g.player_order[0]; // the dealer is the first player in the player_order array
	g.players[g.player_order[0]].isDealer = true;

	if (g.num_players == 2) {
		g.small_blind_player = g.player_order[0];
		g.big_blind_player = g.player_order[1];
	} else {
		g.small_blind_player = g.player_order[1];
		g.big_blind_player = g.player_order[2];
	}


	// initial big blind value
	g.small_blind = 50;
	g.big_blind = 100;
	g.min_bet = g.big_blind;
	g.game_started = true;

	resetGame(); // set up the first hand
}

function doFlop() {
	console.log("doing the flop");

	g.burn.push(g.cards.shift());
	g.board.push(g.cards.shift());
	g.board.push(g.cards.shift());
	g.board.push(g.cards.shift());
	g.player_turn = findNextPlayer(g.dealer);
	if (g.player_turn == "") {
		doTurn();
	}
}

function doTurn() {
	g.burn.push(g.cards.shift());
	g.board.push(g.cards.shift());

	g.player_turn = findNextPlayer(g.dealer);
	if (g.player_turn == "") {
		doRiver();
	}
}

function doRiver() {
	g.burn.push(g.cards.shift());
	g.board.push(g.cards.shift());

	g.player_turn = findNextPlayer(g.dealer);
	if (g.player_turn == "") {
		doShowdown();
	}
}

function doShowdown() {
	/* 
	this is the fun part, figure out who the winner is.
	probably want to cycle thru all the players and figure out who has the best hand
	the tricky part is, if a player folded, then they cannot win
	if a player is all in, then they can only win from each player with money in the pot,
	the amount of money that they bet.
	if more than one player has money left after paying the all in player
	then figure out who the winner is among the remaining players in the pot, repeating 
	the steps for all in players
	an example:
	player A: is all in and his starting money was 15
	player B: starting money was 100 and now has 80 so bet a total of 20
	player C: is all in and his starting money was 20

	so the pot should have 55 in it 15 + 20 + 20
	if player A has the best hand then player A should win 45/55
	if player B has the 2nd best hand then player B should win 10/55
	and player C wins zero

	if player C or player B has the best hand then they would win 55/55

	another more complicated example:
	player A: is all in and his starting money was 15
	player B: starting money was 100 and now has 80 so bet a total of 20
	player C: is all in and his starting money was 20
	player D: folded his hand and started with 80 and has 75 left.

	if player A has the best hand, he wins 15 + 15 + 15 + 5
	if player B has the next best hand, he wins 5 + 5

	most of the time, you want to keep track of side pots so that players still in the hand
	with money left to bet will know how much they could win with the second best hand
	if the allin player has the best hand or how much is at stake with the remaining players
	even if the allin player has the best hand

	so, if a player goes allin, then someone calls the allin or raises the allin, make a sidepot
	
	in the second example above, you would have a sidepot of 15 + 15 + 15 + 5, and a main pot of 5 + 5




	*/ 


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

	shuffleCards();

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

	// the small blind must post the small blind or the rest of his money, whichever is smaller
	g.players[g.small_blind_player].bet = Math.min(g.small_blind, g.players[g.small_blind_player].money);

	g.players[g.small_blind_player].status = "small blind";
	g.players[g.small_blind_player].money -= g.players[g.small_blind_player].bet;
	if (g.players[g.small_blind_player].money == 0) {
		g.players[g.small_blind_player].allin = true;
		g.players[g.small_blind_player].status = "all in";
	}

	g.pots[0]+= g.players[g.small_blind_player].bet;

	// the big blind must post the big blind or the rest of his money, whichever is smaller
	g.players[g.big_blind_player].bet = Math.min( g.big_blind, g.players[ g.big_blind_player ].money);
	g.players[g.big_blind_player].status = "big blind";
	g.players[g.big_blind_player].money -= g.players[g.big_blind_player].bet;
	if (g.players[g.big_blind_player].money == 0) {
		g.players[g.big_blind_player].allin = true;
		g.players[g.big_blind_player].status = "all in";
	}
	g.pots[0] +=  g.players[g.big_blind_player].bet;

	if (g.active_players < 3)
	{
		// two players, the small blind is the first to act if he has money left
		if (g.players[g.small_blind_player].money > 0) {
			g.player_turn = g.small_blind_player;
		} else {
			// if the small blind is all in, then it may be the big blinds turn
			// unless he is all in too
			if (g.players[g.big_blind_player].money > 0) {
				g.player_turn = g.big_blind_player;
				g.status = "pre-flop";
				sendUpdates();
			} else {
				// if the big blind player is also all in, then we just run the cards.
				g.player_turn = "";
				g.status = "flop";
				doFlop();
				//doTurn();
				//doRiver();
				//doShowdown();
			}
		}
	} else
	{
		next_player = "";
		console.log("big blind player index: " + g.players[g.big_blind_player].order);

		// loop thru the players, starting with the player after the big blind
		for (var i= 1 + g.players[g.big_blind_player].order; i< g.players[g.big_blind_player].order + g.num_players; i++) {
			console.log("i=" + i);
			if (g.players[ g.player_order[ i % g.num_players]].money > 0 ) {
				next_player = g.player_order[ i % g.num_players];
				break;
			}
		}

		// more than two players, the player after the big blind is the first to act
		if (next_player != "") {
			g.player_turn = next_player;
			g.status = "pre-flop";
			sendUpdates();
		} else {
			// all players are broke or all in nobody else can act
			doFlop();
		}

	}
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
	g.players[this.id].disconnected = true;
	console.log(g.players[this.id].name + " disconnected.");
}

function isGameOver() {
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

function shuffleCards() {
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
}
function sendUpdates() {
	for (p in g.players) {
		if (! g.players[p].disconnected) {
			sockets[p].emit('update', {game_state: g, my_id: p});
		}
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
