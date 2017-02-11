var currpage = ''
var projectsList = [];
var pageName = null;

$(document).ready(function() {
    $(".navbar-nav li a").click(function(event) {
        $(".navbar-collapse").collapse('hide');
    });
});

function showPage(pagename, arg) {
    console.log(pagename);

    if (pagename == 'projects') {
        setupProjects();
    } else if (pagename == 'farmer') {
        setupFarmer(arg);
    } else if ('payment' == pagename) {
        setupPayment(arg);
    } else if (pagename == 'farmers') {
        setupFarmers();
    } else if ('map' == pagename) {
        loadMap();
    }

    if (pagename != '') {
        $('div[id|="page"]').hide();
        $('#page-' + pagename).show();
        //pageBackHistory.push(currpage);
        currpage = pagename;
    }
}

/* Load map */
var markers = [];
var infoWindows = [];
var contentString = [];
var map = null;
var dontSetBounds = true;

function loadMap() {
    var mapOptions = {
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    if (null == map) {
        map = new google.maps.Map(document.getElementById("div-map"), mapOptions);
        dontSetBounds = false;
    }

    var bounds = new google.maps.LatLngBounds();

    if (0 == projectsList.length) {
        getProjects();
        pageName = 'map';
        //TODO: Show a loading page here
        return;
    }

    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers.length = 0;
    infoWindows.length = 0;
    contentString.length = 0;
    for (var i = 0; i < projectsList.length; i++) {
        //contentString[i] = {};
        var latLong = new google.maps.LatLng(projectsList[i].latitude, projectsList[i].longitude);
        bounds.extend(latLong);

        contentString[i] = '<p style="font-weight:bold">' + projectsList[i].crop + "</p><br />" + '<a href="#" onclick="showPage(\'payment\',' + i + ')">Fund</a>';
        infoWindows[i] = new google.maps.InfoWindow({
            content: contentString[i]
        });

        markers[i] = new google.maps.Marker({
            position: latLong,
            map: map,
        });
        markers[i].addListener('click', function() {
            infoWindows[this.index].open(map, markers[this.index]);
        }.bind({ "index": i }));
    }

    if (!dontSetBounds) {
        map.fitBounds(bounds);
        dontSetBounds = true;
    }
}

/* Payment processing */
function setupPayment(index) {
    var min_amount = projectsList[index].price;
    $("#input-payment_index").val(index);
    $("#div-payment_done").hide();
    $("#div-do_payment").show();
    $("#payment_min_amount").html(" x " + min_amount);
}

/* Payment confirmation */
function contribute() {
    var amount = $("#payment_x").val();
    var multiple = $("#payment_min_amount").text().split(" ");
    var amount = amount * multiple[2];
    var ret = confirm("Confirm payment of Rs. " + amount);
    if (true == ret) {
        doPayment(amount);
    } else {
        return;
    }
}

function doPayment(amount) {
    var post_data = { "amount": amount };
    var index = $("#input-payment_index").val();

    post_data["project_id"] = projectsList[index].project_uid;
    $.post('contribute', post_data, function(data) {
        $("#div-do_payment").hide();
        $("#div-payment_done").show();
    });
}

/* Login Feature */
$("#login_form").submit(function(event) {
    event.preventDefault();
    console.log($("#login_form").serialize());
    $.post('login', $("#login_form").serialize(), function(data) {
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        console.log(data)
        if (data.success) {
            $("#login_form").hide();
            $("#user-name").html(data.name + ' <span class="caret"></span>');
            $("#user-info").show();
            showMessage(data.message, 'darkgreen');
            document.cookie = "cke=" + data.cookie + ";";
        } else {
            showMessage(data.message, 'darkred');
            document.cookie = "cke=;";
        }
    });
});

/* Show snackbar */
function showMessage(message, bgcolor) {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar")

    // Add the "show" class to DIV
    $(x).html(message);
    $(x).css("background-color", bgcolor);
    x.className = "show";


    // After 3 seconds, remove the show class from DIV
    setTimeout(function() { x.className = x.className.replace("show", ""); }, 3000);
}

/* Function to setup projects */
function setupProjects() {
    var source = $("#projectcard-template").html();
    var template = Handlebars.compile(source);
    var proj_len, i;
    $("#list-project").empty();


    if (0 == projectsList.length) {
        getProjects();
        pageName = 'projects';
        //TODO: Show loading page here
        return;
    }

    var data = {};
    data.data = projectsList;

    for (proj_len = data.data.length, i = 0; i < proj_len; ++i) {
        data.data[i]['fund_progress'] = (data.data[i]['amount'] * 100) / data.data[i]['target_fund'];
        data.data[i]['position_index'] = i;
        $("#list-project").append(template(data.data[i]));
    }
    /*
    var req_data = {};
    $.get("projects", function(data, status) {
        //TODO: Remove this log
        console.log(data);
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        // TODO: Handle errors gracefully
        if (!data.success) {
            console.log(data.message);
            return;
        }
        var proj_len, i;
        $("#list-project").empty();

        projectsList = data.data;
        for (proj_len = data.data.length, i = 0; i < proj_len; ++i) {
            data.data[i]['fund_progress'] = (data.data[i]['amount'] * 100) / data.data[i]['target_fund'];
            data.data[i]['position_index'] = i;
            $("#list-project").append(template(data.data[i]));
        }
    });
    */
}

function getProjects() {
    var req_data = {};
    $.get("projects", function(data, status) {
        //TODO: Remove this log
        console.log(data);
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        // TODO: Handle errors gracefully
        if (!data.success) {
            console.log(data.message);
            return;
        }

        projectsList = data.data;
        showPage(pageName);
    });
}

function setupFarmer(arg) {
    var prjcard = $("#projectcard-template").html();
    var prjtemp = Handlebars.compile(prjcard);
    var farmercard = $("#farmer-template").html();
    var farmertemp = Handlebars.compile(farmercard);
    var req_data = {};
    $.get("farmer/" + arg, function(data, status) {
        //TODO: Remove this log
        console.log(data);
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        // TODO: Handle errors gracefully
        if (!data.success) {
            console.log(data.message);
            return;
        }
        var proj_len, i;
        $("#list-farmer").empty();
        data.data[0]['bgnumber'] = Math.floor(10 * Math.random()) + 1;

        $("#list-farmer").append('<div class="row">' + farmertemp(data.data[0]) +
            '<div class="col-md-9">' + '<h2>About me</h2><p>' +
            data.data[0]['about_me'] + '</p></div></div> <div class="col-md-12">' +
            '<h3>Current Projects</h3></div>');
        for (proj_len = data.prjlist.length, i = 0; i < proj_len; ++i) {

            if (data.prjlist[i]['current_stage'] != 'Completed') {

                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                console.log(data.prjlist[i])
                $("#list-farmer").append(prjtemp(data.prjlist[i]));
            }
        }
        $("#list-farmer").append('<div class="col-md-12"><h3>Past Projects</h3></div>');
        for (proj_len = data.prjlist.length, i = 0; i < proj_len; ++i) {
            if (data.prjlist[i]['current_stage'] == 'Completed') {
                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                console.log(data.prjlist[i])
                $("#list-farmer").append(prjtemp(data.prjlist[i]));
            }
        }

    });
}

function setupFarmers() {
    var farmercard = $("#farmer-template").html();
    var farmertemp = Handlebars.compile(farmercard);
    var req_data = {};
    $.get("farmers", function(data, status) {
        //TODO: Remove this log
        console.log(data);
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        // TODO: Handle errors gracefully
        if (!data.success) {
            console.log(data.message);
            return;
        }
        var proj_len, i;
        $("#list-farmers").empty();

        for (proj_len = data.data.length, i = 0; i < proj_len; ++i) {
            data.data[i]['bgnumber'] = Math.floor(10 * Math.random()) + 1;
            $("#list-farmers").append(farmertemp(data.data[i]));
        }
    });
}