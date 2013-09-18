var game = {};
var socket;


window.onload = function() {

	//socket = io.connect('http://localhost:3000');
	socket = io.connect(null);
	socket.on('alert', function (data) {
		window.alert(data.message);
	});

	socket.on('update', function (data) {
		txtMoney = document.getElementById("txtMoney");
		txtMoney.value = data.game_state.players[ data.my_id ].money;

	});
	setInterval(update, 3000);
}

function update() {
	socket.emit('update',{});
}

