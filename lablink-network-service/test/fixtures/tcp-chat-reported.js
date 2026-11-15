function solve(input) {
    if (input.service === "offline") {
        return { error: true };
    }

    var socket = null;
    var replies = [];
    var welcome = "";

    try {
        socket = tcp.connect("chat");

        tcp.send(socket, "USER " + input.username);
        welcome = tcp.read(socket);

        for (var i = 0; i < input.messages.length; i++) {
            tcp.send(socket, "MSG " + input.messages[i]);
            replies.push(tcp.read(socket));
        }

        tcp.send(socket, "QUIT");

        var disconnect = tcp.read(socket);

        tcp.close(socket);

        return {
            welcome: welcome,
            replies: replies,
            closed: true
        };
    } catch (e) {
        if (socket !== null) {
            try {
                tcp.close(socket);
            } catch (ignored) {
            }
        }

        return { error: true };
    }
}
