var currpage = ''
var projectsList = [];
var currentIndex = 0;
var pageName = null;

$(document).ready(function() {
    $.get('whoami', function(data) {
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        console.log(data)
        if (data.success) {
            $("#login_form").hide();
            $("#user-name").html(data.name + ' <span class="caret"></span>');
            $("#user-info").show();
        } else {
            $("#login_form").show();
            $("#user-info").hide();
        }
    });

    $(".navbar-nav li a").click(function(event) {
        $(".navbar-collapse").collapse('hide');
    });
});

function showPage(pagename, arg) {
    console.log(pagename);

    if (pagename == 'projects') {
        setupProjects();
        $('div[id|="page"]').hide();
        $('#page-' + pagename).show();
        //pageBackHistory.push(currpage);
        currpage = pagename;
    } else if (pagename == 'farmer') {
        setupFarmer(arg);
    } else if (pagename == 'payment') {
        setupPayment(arg);
    } else if (pagename == 'farmers') {
        setupFarmers();
    } else if (pagename == 'map') {
        loadMap();
    } else if ('dashboard' == pagename) {
        setupDashboard();
    } else if (pagename != '') {
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
    if (0 == projectsList.length) {
        getProjects();
        pageName = 'map';
        //TODO: Show a loading page here
        return;
    }

    var mapOptions = {
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    if (null == map) {
        map = new google.maps.Map(document.getElementById("div-map"), mapOptions);
        dontSetBounds = false;
    }

    var bounds = new google.maps.LatLngBounds();

    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers.length = 0;
    infoWindows.length = 0;
    contentString.length = 0;
    for (var i = 0; i < projectsList.length; i++) {
        /* Don't show Completed projects in Map */
        if ("Completed" == projectsList[i].current_stage) {
            continue;
        }

        var latLong = new google.maps.LatLng(projectsList[i].latitude, projectsList[i].longitude);
        bounds.extend(latLong);

        contentString[i] = '<br /><p style="font-weight:bold">' + projectsList[i].crop + "</p><img style='max-width: 90px; max-height: 90px;' src='img/products/" + projectsList[i].type + "/" + projectsList[i].crop + ".jpg'><br />" + '<br /><a href="#" onclick="showPage(\'payment\',' + i + ')"><span style="font-weight:bold;" class="text-center"> Fund</a>';
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

    $('div[id|="page"]').hide();
    $('#page-map').show();
    //pageBackHistory.push(currpage);
    currpage = 'map';
}

/* Payment processing */
function setupPayment(index) {
    var min_amount = projectsList[index].price;
    var source = $("#projectcard-template").html();
    var template = Handlebars.compile(source);
    var price_source = $("#price-template").html();
    var price_template = Handlebars.compile(price_source);
    currentIndex = index;
    $("#input-payment_index").val(index);
    $("#div-payment_done").hide();
    $("#div-do_payment").show();
    $("#payment_min_amount").html(" x " + min_amount);
    $("#list-payment").empty();
    $("#list-payment").prepend(template(projectsList[index]));

    $("#payment_detail").html(price_template(projectsList[index]));
    $('div[id|="page"]').hide();
    $('#page-payment').show();
    //pageBackHistory.push(currpage);
    currpage = 'payment';
}

function calcTotal(change) {
    var chng = parseInt(change);
    var totalvalue = 0;
    currValue = parseInt($("#buy_units").val());
    currValue = currValue + chng;
    if (currValue > 100) {
        currValue = 100;
    } else if (currValue <= 0) {
        currValue = 1;
    }
    $("#buy_units").val(currValue);
    totalvalue = currValue * parseInt(projectsList[currentIndex]['quantity']) * parseInt(projectsList[currentIndex]['price']);
    $("#total_value").html("<i class=\"fa fa-inr aria-hidden='true'\"></i>" + totalvalue);
}
/* Payment confirmation */
function contribute() {
    var amount = parseInt($("#total_value").text());

    var ret = confirm("Confirm payment of Rs. " + amount);
    if (true == ret) {
        doPayment(amount);
    } else {
        return;
    }
}

function doPayment(amount) {
    var post_data = { "amount": amount };
    post_data["project_id"] = projectsList[currentIndex].project_uid;
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

function logout() {
    event.preventDefault();
    $.get('logout', function(data) {
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        console.log(data)
        if (data.success) {
            document.cookie = "cke=;";
            setTimeout(function() {
                location.reload();
                console.log(window.location.href);
                window.location.href = window.location.href;
                location.href = location.href;
            }, 400);
        } else {
            showMessage(data.message, 'darkred');
        }
    });

}

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
        if (data.data[i]['current_stage'] == 'Completed') {
            data.data[i]['not_completed'] = false;
        } else {
            data.data[i]['not_completed'] = true;
        }

        $("#list-project").append(template(data.data[i]));
    }
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
        var  len = data.data.length;
        for (var i = 0; i < len; i++){
            if (data.data[i]['current_stage'] == 'Completed') {
                data.data[i]['not_completed'] = false;
            } else {
                data.data[i]['not_completed'] = true;
            }
        }
        projectsList = data.data;
        showPage(pageName);
        pageName = null;
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
        data.data[0]['bgnumber'] = parseInt(data.data[0]['farmer_uid'], 10) % 10 + 1;

        $("#list-farmer").append('<div class="row">' + farmertemp(data.data[0]) +
            '<div class="col-md-9">' + '<h2>About me</h2><p>' +
            data.data[0]['about_me'] + '</p></div></div> <div class="col-md-12">' +
            '<h3>Current Projects</h3></div>');
        for (proj_len = data.prjlist.length, i = 0; i < proj_len; ++i) {

            if (data.prjlist[i]['current_stage'] != 'Completed') {
                data.prjlist[i]['fund_progress'] = (data.prjlist[i]['amount'] * 100) / data.prjlist[i]['target_fund'];
                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                data.prjlist[i]['not_completed'] = true;
                console.log(data.prjlist[i])
                $("#list-farmer").append(prjtemp(data.prjlist[i]));
            }
        }
        $("#list-farmer").append('<div class="col-md-12"><h3>Past Projects</h3></div>');
        for (proj_len = data.prjlist.length, i = 0; i < proj_len; ++i) {
            if (data.prjlist[i]['current_stage'] == 'Completed') {
                data.prjlist[i]['fund_progress'] = (data.prjlist[i]['amount'] * 100) / data.prjlist[i]['target_fund'];
                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                data.prjlist[i]['not_completed'] = false;
                console.log(data.prjlist[i])
                $("#list-farmer").append(prjtemp(data.prjlist[i]));
            }
        }
        $('div[id|="page"]').hide();
        $('#page-farmer').show();
        //pageBackHistory.push(currpage);
        currpage = 'farmer';
    });
}

function setupDashboard(arg) {
    var dashCard = $("#dashboard-card-template").html();
    var dashTemp = Handlebars.compile(dashCard);
    var req_data = {};

    if (0 == projectsList.length) {
        pageName = "dashboard";
        getProjects();
        return;
    }

    $.get("journal", function(data, status) {
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
        data = data.data;
        var proj_len, i;
        var templateInput = [];
        var inputIndex = 0;
        var templateCompletedInput = [];
        var inputCompletedIndex = 0;
        for (i = 0; i < data.length; i++) {
            for (var j = 0; j < projectsList.length; j++) {
                if (data[i].project_id == projectsList[j].project_uid) {
                    if ('Completed' != projectsList[j].current_stage) {
                        templateInput[inputIndex] = projectsList[j];
                        templateInput[inputIndex]['fund_progress'] = (projectsList[j]['amount'] * 100) / projectsList[j]['target_fund'];
                        templateInput[inputIndex]["contributed_amount"] = data[i].spent;
                        templateInput[inputIndex]["crop_quantity"] = data[i].spent / projectsList[j].price * projectsList[j].quantity;
                        inputIndex++;
                        break;
                    } else {
                        templateCompletedInput[inputCompletedIndex] = projectsList[j];
                        templateCompletedInput[inputCompletedIndex]['fund_progress'] = (projectsList[j]['amount'] * 100) / projectsList[j]['target_fund'];
                        templateCompletedInput[inputCompletedIndex]["contributed_amount"] = data[i].spent;
                        templateCompletedInput[inputCompletedIndex]["crop_quantity"] = data[i].spent / projectsList[j].price * projectsList[j].quantity;
                        inputCompletedIndex++;
                    }
                }
            }
        }
        $("#list-dashboard").empty();

        $("#list-dashboard").append('<div class="row">' + '<div class="col-md-12">' +
            '<h3>Current Projects</h3></div>');
        for (i = 0; i < inputIndex; i++) {
            $("#list-dashboard").append(dashTemp(templateInput[i]));
            /*
            if (data.prjlist[i]['current_stage'] != 'Completed') {
                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                console.log(data.prjlist[i])
                
            }
            */
        }
        $("#list-dashboard").append('<div class="col-md-12"><h3>Past Projects</h3></div>');
        for (i = 0; i < inputCompletedIndex; i++) {
            $("#list-dashboard").append(dashTemp(templateCompletedInput[i]));
            /*
            if (data.prjlist[i]['current_stage'] == 'Completed') {
                data.prjlist[i]['farmer_name'] = data.data[0]['farmer_name'];
                data.prjlist[i]['farmer_uid'] = data.data[0]['farmer_uid'];
                console.log(data.prjlist[i])
                $("#list-farmer").append(prjtemp(data.prjlist[i]));
            }
            */
        }
        $('div[id|="page"]').hide();
        $('#page-dashboard').show();
        //pageBackHistory.push(currpage);
        currpage = 'dashboard';
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
            data.data[i]['bgnumber'] = parseInt(data.data[i]['farmer_uid'], 10) % 10 + 1;
            $("#list-farmers").append(farmertemp(data.data[i]));
        }
        $('div[id|="page"]').hide();
        $('#page-farmers').show();
        //pageBackHistory.push(currpage);
        currpage = 'farmers';
    });
}