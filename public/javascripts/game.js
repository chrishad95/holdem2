var game = {};
var socket;
var sources = {
	bg: 'images/table.png',
	cards: 'images/cards.gif'
};
var images = {};

var player_positions = [];
player_positions[0] = {x: 452, y:100};
player_positions[1] = {x: 641, y:190};
player_positions[2] = {x: 650, y:326};
player_positions[3] = {x: 547, y:447};
player_positions[4] = {x: 380, y:460};
player_positions[5] = {x: 171, y:447};
player_positions[6] = {x: 67, y:326};
player_positions[7] = {x: 78, y:190};
player_positions[8] = {x: 267, y:100};

var card_positions = [];
card_positions[0] = {x: 462, y:68} ;
card_positions[1] = {x: 655, y:158};
card_positions[2] = {x: 665, y:294};
card_positions[3] = {x: 562, y:414};
card_positions[4] = {x: 355, y:430};
card_positions[5] = {x: 147, y:414};
card_positions[6] = {x: 43, y:294};
card_positions[7] = {x: 53, y:158};
card_positions[8] = {x: 241, y:68} ;

var card_width = 125;
var card_height = 905 / 5;



$(function () {
	loadImages(sources, initStage);

	//socket = io.connect('http://localhost:3000');
	socket = io.connect(null);
	socket.on('alert', function (data) {
		window.alert(data.message);
	});

	socket.on('update', function (data) {

		// update money values...  
		for (p in data.game_state.player_order) {
			game.money_labels[p].setText( data.game_state.players[ data.game_state.player_order[p] ].money);
		}
		for (p in data.game_state.player_order) {
			game.status_labels[p].setText( data.game_state.players[ data.game_state.player_order[p] ].status);
		}
		game.moneyLayer.draw();

		// draw cards for me.

		// do the cards
		var cards = [];
		var suits = ['S','H','D','C'];
		var ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

		var cardvals = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
		var cardsuits = ['H','D','C','S'];
		var positions = {};

		for (var i=0; i<cardsuits.length; i++){
			for (var j=0; j<cardvals.length; j++){
				positions[cardvals[j] + cardsuits[i]] = {x: ( j* card_width), y:(i* card_height)};	
			}
		}

		// draw my first card.
		//console.log("draw cards");

	  	var cardcounter = 0;
		for (p in data.game_state.player_order) {
			if (data.game_state.player_order[p] == data.my_id) {
				for (c in data.game_state.players[ data.game_state.player_order[p] ].cards)
				{
					//console.log("draw card: " + data.game_state.players[ data.my_id ].cards[c]);
					//ctx.drawImage(img,positions[data.cards[c]].x,positions[data.cards[c]].y,79,123,card_counter * 79,0,79,123);

        			var card = new Kinetic.Image({
        			  x: card_positions[p].x + (c * 50),
        			  y: card_positions[p].y,
					  crop: {width: card_width, height: (card_height / 2), x: positions[data.game_state.players[  data.game_state.player_order[p] ].cards[c]].x, y: positions[data.game_state.players[  data.game_state.player_order[p] ].cards[c]].y},
					  width: 50,
					  height: 36,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);
				}
			} else {
					// this is the card back
        			var card = new Kinetic.Image({
        			  x: card_positions[p].x,
        			  y: card_positions[p].y,
					  crop: {width: card_width, height: (card_height / 2), x: 0, y: card_height * 4},
					  width: 50,
					  height: 36,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);
        			var card = new Kinetic.Image({
        			  x: card_positions[p].x +  50,
        			  y: card_positions[p].y,
					  crop: {width: card_width, height: (card_height / 2), x: 0, y: card_height * 4},
					  width: 50,
					  height: 36,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);

			}
		}
		var board_counter = 0;
		for (c in data.game_state.board) {
			switch(board_counter) {
				case 0:
        			var card = new Kinetic.Image({
        			  x: 271,
        			  y: 243,
					  crop: {width: card_width, height: (card_height), x: positions[data.game_state.board[c]].x, y: positions[data.game_state.board[c]].y},
					  width: 50,
					  height: 72,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);
					
				break;

				case 1:
        			var card = new Kinetic.Image({
        			  x: 325,
        			  y: 243,
					  crop: {width: card_width, height: (card_height), x: positions[data.game_state.board[c]].x, y: positions[data.game_state.board[c]].y},
					  width: 50,
					  height: 72,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);

				break;
				case 2:
        			var card = new Kinetic.Image({
        			  x: 379,
        			  y: 243,
					  crop: {width: card_width, height: (card_height), x: positions[data.game_state.board[c]].x, y: positions[data.game_state.board[c]].y},
					  width: 50,
					  height: 72,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);

				break;
				case 3:
        			var card = new Kinetic.Image({
        			  x: 433,
        			  y: 243,
					  crop: {width: card_width, height: (card_height), x: positions[data.game_state.board[c]].x, y: positions[data.game_state.board[c]].y},
					  width: 50,
					  height: 72,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);

				break;

				case 4:
        			var card = new Kinetic.Image({
        			  x: 487,
        			  y: 243,
					  crop: {width: card_width, height: (card_height), x: positions[data.game_state.board[c]].x, y: positions[data.game_state.board[c]].y},
					  width: 50,
					  height: 72,
        			  image: images.cards
        			});
        			game.cardsLayer.add(card);

				break;

			}

			board_counter++;
		}
        game.cardsLayer.draw();

		if (data.game_state.player_turn == data.my_id) {

			var amount_to_call = 0;
			if (data.game_state.required_bet > data.game_state.players[data.my_id].bet)
			{
				amount_to_call = data.game_state.required_bet - data.game_state.players[data.my_id].bet;

				// player can only call as much money as he has (all in)
				if (amount_to_call >= data.game_state.players[data.my_id].money) {
					amount_to_call = "All In";
				}

        		game.btnCall = new Kinetic.Image({
        		  x: 420,
        		  y: 544,
				  crop: {width: 122, height: 28, x: 122, y: 672},
				  width: 122,
				  height: 28,
        		  image: images.bg
        		});
        		game.buttonLayer.add(game.btnCall);
				game.btnCall.on('click', callBet);

				// add the Call text
		    	  game.txtCall  = new Kinetic.Text({
		    	    x: 429,
		    	    y: 552,
		    	    text: 'Call ' + amount_to_call,
		    	    fontSize: 14,
		    	    fontFamily: 'Calibri',
		    	    fill: '#fff',
		    	    width: 100,
		    	    padding: 0,
		    	    align: 'center'
		    	  });
				game.txtCall.on('click', callBet );
		
				game.buttonLayer.add(game.txtCall);
			}
        	game.btnFold = new Kinetic.Image({
        	  x: 546,
        	  y: 544,
			  crop: {width: 122, height: 28, x: 122, y: 672},
			  width: 122,
			  height: 28,
        	  image: images.bg
        	});

        	game.buttonLayer.add(game.btnFold);
			game.btnFold.on('click', clickFold);

			// add the Fold text
		      game.txtFold  = new Kinetic.Text({
		        x: 555,
		        y: 552,
		        text: 'Fold',
		        fontSize: 14,
		        fontFamily: 'Calibri',
		        fill: '#fff',
		        width: 100,
		        padding: 0,
		        align: 'center'
		      });
			game.txtFold.on('click', clickFold );
			game.buttonLayer.add(game.txtFold);
        	game.buttonLayer.draw();
		}



	});
	
	setInterval(update, 3000);
});


function update() {
	socket.emit('update',{});
}

function initStage(images) {
	var stage = new Kinetic.Stage({
	  container: 'container',
	  width: 808,
	  height: 644
	});
  var messageLayer = new Kinetic.Layer();

	var bgLayer = new Kinetic.Layer();
	bgLayer.add( new Kinetic.Image({
  	image: images.bg,
  	x: 0,
  	y: 0
  }));

//btnHand1.on('mouseover', function () { writeMessage(messageLayer, pct1, 10,200); });

	game.buttonLayer = new Kinetic.Layer();

	/*
	var btnHand1 = new Kinetic.Image({
        x: 241,
        y: 68,
		crop: {width: card_width , height: card_height, x: 0, y: 0},
		width: 50,
		height: 70,
        image: images.cards,
		draggable: true
	});
	btnHand1.on('dragend', function () { console.log("button1 x=" + this.getX() + " y=" + this.getY());});
	game.buttonLayer.add(btnHand1);
	*/

	// setup the labels for the money
	game.moneyLayer = new Kinetic.Layer();
	game.money_labels = [];
	for (var i=0; i<9; i++) {
		      // since this text is inside of a defined area, we can center it using
		      // align: 'center'
		      game.money_labels[i]  = new Kinetic.Text({
		        x: player_positions[i].x,
		        y: player_positions[i].y,
		        text: '0',
		        fontSize: 12,
		        fontFamily: 'Calibri',
		        fill: '#000',
		        width: 100,
		        padding: 20,
		        align: 'right'
		      });
		
		game.moneyLayer.add(game.money_labels[i]);
	}

	// setup the labels for the player status
	game.status_labels = [];
	for (var i=0; i<9; i++) {
		      // since this text is inside of a defined area, we can center it using
		      // align: 'center'
		      game.status_labels[i]  = new Kinetic.Text({
		        x: player_positions[i].x,
		        y: player_positions[i].y + 25,
		        text: '',
		        fontSize: 12,
		        fontFamily: 'Calibri',
		        fill: '#000',
		        width: 100,
		        padding: 20,
		        align: 'right'
		      });
		
		game.moneyLayer.add(game.status_labels[i]);
	}

  stage.add(bgLayer);
  stage.add(game.moneyLayer);
  stage.add(game.buttonLayer);
  stage.add(messageLayer);

	game.cardsLayer = new Kinetic.Layer();

  // add the layer to the stage
  stage.add(game.cardsLayer);
}

function loadImages(sources, callback) {
	var assetDir = '';
	images = {};
	var loadedImages = 0;
	var numImages = 0;
	for(var src in sources) {
		numImages++;
	}
	for(var src in sources) {
	  images[src] = new Image();
	  images[src].onload = function() {
	    if(++loadedImages >= numImages) {
	      callback(images);
	    }
	  };
	  images[src].src = assetDir + sources[src];
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

function callBet() {
	console.log("clicked call button");
	socket.emit("callBet", {});
}
function clickFold() {
	console.log("clicked fold button");
	socket.emit("foldHand", {});

}
