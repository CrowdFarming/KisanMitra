var dbhost = process.env.OPENSHIFT_MYSQL_DB_HOST;
var dbport = process.env.OPENSHIFT_MYSQL_DB_PORT;
var dbusername = process.env.OPENSHIFT_MYSQL_DB_USERNAME;
var dbpassword = process.env.OPENSHIFT_MYSQL_DB_PASSWORD;
var db_name = process.env.OPENSHIFT_GEAR_NAME;

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: dbhost,
    port: dbport,
    user: dbusername,
    password: dbpassword,
    database: db_name
});

connection.connect(function(err) {
    if (!err) {
        console.log("Database is connected ... \n\n");
    } else {
        console.log("Error in connecting database ... \n\n");
        process.exit(-1);
    }
});

const http = require('http'),
    fs = require('fs'),
    path = require('path'),
    contentTypes = require('./utils/content-types'),
    sysInfo = require('./utils/sys-info'),
    express = require('express'),
    request = require("request"),
    uuidV4 = require('uuid/v4'),
    env = process.env;

var logFile = fs.createWriteStream('log.txt', { flags: 'a' });

var app = express();

app.use(express.static('static'));
var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get("/test", test_page);
app.post("/login", user_login);
app.get("/whoami", get_current_user);
app.get("/logout", user_logout);
app.get("/projects", get_projects);
app.get("/project", get_individual_project);
app.get("/journal", get_journal);
app.get("/farmer/:uid", get_farmer);
app.get("/farmers", get_farmers);
app.post("/contribute", do_payment);

app.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', function() {
    console.log("new client");
});

/*
 * API callbacks
 */
function do_payment(req, res) {
    var cookie = req.headers.cookie;
    var amount = req.body.amount;
    var project_id = req.body.project_id;

    log("do_payment: amount = " + amount + ", project_id: " + project_id + ", token: " + cookie);

    cookie = cookie.split("cke=")[1];

    var get_user_query = "SELECT * FROM cookies WHERE token = ?";
    var get_user_data = [];
    get_user_data.push(cookie);
    connection.query(get_user_query, get_user_data, function(error, token_result) {
        if (error) {
            log("get_user_query: db/query error - token: " + cookie + ", amount: " + amount);
            res.send("query or db error");
            return;
        } else if (1 != token_result.length) {
            log("get_user_query: duplicate-token: " + cookie + ", amount: " + amount + ", length: " + token_result.length);
            res.send("duplicate entry for token");
            remove_cookie(cookie.cke);
            return;
        }

        var ins_query = "INSERT INTO journal SET ?";
        var ins_data = {};
        ins_data["project_id"] = project_id;
        ins_data["user_id"] = token_result[0].user_id;
        //TODO: do alternative for payment_id
        ins_data["payment_id"] = uuidV4();
        ins_data["amount"] = amount;
        ins_data["payment_type"] = "online";
        ins_data["credit"] = "no";
        connection.query(ins_query, ins_data, function(j_error, journal_result) {
            if (j_error) {
                log(j_error);
                log("get_user_query: journal error - token: " + cookie + ", amount: " + amount);
                res.send("journal error");
                return;
            }
            log("get_user_query: successfull - token: " + cookie + ", amount: " + amount);
            res.send("success");
        });
    });
    return;
}

function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function test_page(req, res) {
    res.send("Test success.");
}

function get_current_user(req, res) {

    var cookie = parseCookies(req)
    var response_data = {}
    var get_query = "SELECT * FROM `cookies` WHERE `token` = '" + cookie['cke'] + "'";
    console.log(get_query)
    connection.query(get_query, function(err, result) {
        console.log("get user query")
        if (err || 0 == result.length || result.length > 1) {
            console.log("fa1")
            res.send({ success: false, message: "User not found" });
            return;
        } else {
            var get_user_qry = "SELECT * FROM `user_details` where `uid`=" + result[0].user_id;
            connection.query(get_user_qry, function(err, result) {
                if (err || 0 == result.length || result.length > 1) {
                    console.log("fa2")
                    res.send({ success: false, message: "User not found" });
                    return;
                } else {
                    response_data['name'] = result[0].name;
                    response_data['email'] = result[0].email;
                    response_data['phone'] = result[0].phone;
                    response_data['success'] = true;
                    response_data['message'] = 'User found in Successfully';
                    log("user found");
                    res.send(response_data);
                    return;
                }
            });
        }
    });
}

function user_login(req, res) {
    var username = req.body.userid;
    var password = req.body.pass;
    var loginQuery;


    console.log("username = " + username + " password = " + password);

    if (true == validateEmail(username)) {
        loginQuery = "SELECT * FROM user_details WHERE email = ? AND password = ?";
    } else {
        loginQuery = "SELECT * FROM user_details WHERE phone = ? AND password = ?";
    }

    var loginData = [];
    loginData.push(username);
    loginData.push(password);

    connection.query(loginQuery, loginData, function(error, result) {
        if (error) {
            console.log("db or query error" + error);
            var response_data = {};
            response_data['success'] = false;
            response_data['message'] = 'DB error';
            res.send(response_data);
            return;
        } else if (0 == result.length) {
            console.log("invalid user");
            var response_data = {};
            response_data['success'] = false;
            response_data['message'] = 'Password or Userid invalid';
            res.send(response_data);
            return;
        } else if (1 != result.length) {
            console.log("duplicate entry")
            var response_data = {};
            response_data['success'] = false;
            response_data['message'] = 'Invalid userid';
            res.send(response_data);
            return;
        }

        var token = uuidV4();
        var insert_data = {};
        insert_data['token'] = token;
        insert_data['user_id'] = result[0].uid;
        log("inserting into cookies token = " + token + ", user_id = " + result[0].uid);
        /* Timestamp will be added by default */

        var insert_query = "INSERT INTO cookies SET ?";
        connection.query(insert_query, insert_data, function(ins_error, ins_result) {
            if (ins_error) {
                log("cookie db or query error " + ins_error)
                res.send("cookie db or query error");
                return;
            }

            var response_data = {};

            response_data['cookie'] = token;
            response_data['name'] = result[0].name;
            response_data['email'] = result[0].email;
            response_data['phone'] = result[0].phone;
            response_data['success'] = true;
            response_data['message'] = 'Logged in Successfully';
            log("login success");
            res.send(response_data);
            return;
        });
    });
}

function user_logout(req, res) {
    var cookie = parseCookies(req)
    var delete_query = "DELETE FROM `cookies` WHERE `token` = '" + cookie['cke'] + "'";

    connection.query(delete_query, function(err, result) {
        console.log("delete query")
        if (err) {
            console.log("Logout error");
            res.send({ success: false, message: "Logout failure" });
            return;
        }
        console.log("Logout success");
        res.send({ success: true, message: "Logout success" });
        return;
    });
}

function get_projects(req, res) {
    var response_data = {};
    var select_query = "SELECT * FROM project_details JOIN farmer_details ON project_details.farmer_id = farmer_details.farmer_uid";
    connection.query(select_query, function(err, select_result) {
        if (err) {

            response_data['success'] = false;
            response_data['message'] = 'Database or Query error';
            res.send(response_data);
            return;
        }
        response_data['success'] = true;
        response_data['message'] = 'Query Success';
        response_data['data'] = select_result;
        res.send(response_data);
    });
}

function get_farmer(req, res) {
    var response_data = {};
    var select_query = "SELECT * FROM farmer_details WHERE farmer_uid = " + req.params.uid;
    console.log(select_query);
    connection.query(select_query, function(err, select_result) {
        if (err) {

            response_data['success'] = false;
            response_data['message'] = 'Database or Query error';
            res.send(response_data);
            return;
        }
        response_data['success'] = true;
        response_data['message'] = 'Query Success';
        response_data['data'] = select_result;
        select_query = "SELECT * FROM project_details WHERE farmer_id = " + req.params.uid;
        console.log(select_query);
        connection.query(select_query, function(err, select_result) {
            if (!err) {
                response_data['prjlist'] = select_result;
            }
            res.send(response_data);
        });
    });
}


function get_farmers(req, res) {
    var response_data = {};
    var select_query = "SELECT * FROM farmer_details";

    connection.query(select_query, function(err, select_result) {
        if (err) {

            response_data['success'] = false;
            response_data['message'] = 'Database or Query error';
            res.send(response_data);
            return;
        }
        response_data['success'] = true;
        response_data['message'] = 'Query Success';
        response_data['data'] = select_result;
        res.send(response_data);
    });
}

function get_individual_project(req, res) {
    var cookie = req.headers.cookie;
    var project_id = req.query.id;

    /*
     * TODO: Need to confirm whether this check is needed.
     * If user wants to see projects without loggin this check should be removed.
     
    if (false == verify_cookie(cookie)) {
        res.send("Invalid cookie");
        return;
    }
    */

    var product_select_query = "SELECT * FROM project_details WHERE uid = ?";
    connection.query(product_select_query, project_id, function(error, project_result) {
        if (error) {
            log("get_project: select_projects - db or query error");
            res.send("db or query error");
            return;
        } else if (1 != project_result.length) {
            log("get_project: select_projects - duplicate entries");
            res.send("duplicate entries in project table");
            return;
        }

        var result = project_result[0];
        var farmer_id = project_result[0].farmer_uid;
        var select_farmer_query = "SELECT * FROM farmer_details WHERE uid = ?";
        connection.query(select_farmer_query, farmer_id, function(farmer_error, farmer_result) {
            if (error) {
                log("get_project: select_farmer - db or query error");
                res.send("db or query error");
                return;
            } else if (1 != farmer_result.length) {
                log("get_project: select_farmer - duplicate entries");
                res.send("duplicate entries in farmer table");
                return;
            }

            var farmer_details = farmer_result[0];
            result["name"] = farmer_details.name;
            result["phone"] = farmer_details.phone;
            result["email"] = farmer_details.email;
            result["pan"] = farmer_details.pan;
            result["aadhar_no"] = farmer_details.aadhar_no;
            result["address"] = farmer_details.address;
            result["experience"] = farmer_details.experience;
            result["land"] = farmer_details.land;
            result["farmer_id"] = farmer_details.uid;

            log("get_project: success - project_id: " + project_id);
            res.send(result);
        });
    });
}

function get_journal(req, res) {
    var cookie = req.headers.cookie;
    //var project_id = req.query.project;
    cookie = cookie.split("cke=")[1];
    log("get_journal cookie: " + cookie);
    //var user_id = req.query.user;

    /*
    if (false == verify_cookie_for_user(cookie, user_id)) {
        log("get_journal: user_id is not matching with cookie");
        res.send("user_id is not matching with cookie");
        return;
    }
    */

    var select_user = "SELECT * FROM cookies WHERE token = ?";
    var select_user_data = [];
    select_user_data.push(cookie);
    connection.query(select_user, select_user_data, function(user_select_error, user_result) {
        if (user_select_error) {
            log("get_journal: user_select query/db error - cookie: " + cookie);
            res.send("Query/Db error");
            return;
        } else if (1 != user_result.length) {
            log("get_journal: user_select duplicate - cookie: " + cookie);
            res.send("duplicate entry");
            return;
        }

        var user_id = user_result[0].user_id;
        var select_journal_query = "SELECT SUM(amount) AS spent , project_id FROM journal WHERE credit = 'no' AND user_id = ? GROUP BY project_id";
        var select_journal_data = [];
        select_journal_data.push(user_id);
        connection.query(select_journal_query, select_journal_data, function(journal_error, journal_result) {
            if (journal_error) {
                log("get_journal: journal_select query/db error - cookie: " + cookie);
                res.send("Query/Db error");
                return;
            }

            var responseObj = {};
            responseObj.success = true;
            responseObj.data = journal_result;
            res.send(responseObj);
        });
    });

    /*
        var journal_query = "SELECT * FROM journal WHERE ";
        var journal_data = [];

        if (("" != user_id) && ("" != project_id)) {
            journal_query += "project_id = ? AND user_id = ?";
            journal_data.push(project_id);
            journal_data.push(user_id);
        } else if ("" != user_id) {
            journal_query += "user_id = ?";
            journal_data.push(user_id);
        } else if ("" != project_id) {
            journal_query += "project_id = ?";
            journal_data.push(project_id);
        } else {
            log("get_journal: user_id and project_id both cannot be empty");
            res.send("user_id and project_id both cannot be empty");
            return;
        }

        connection.query(journal_query, journal_data, function(error, journal_result) {
            if (error) {
                res.send("query or db error");
                return;
            }

            res.send(journal_result);
        });
        */
}


/*
 * query callbacks
 */
function loginSuccessCallback(error, result) {
    if (error) {
        log("db or query error")
        res.send("db or query error");
        return;
    } else if (1 != result.length) {
        log("duplicate entry")
        res.send("duplicate entry");
        return;
    }

    var token = uuidV4();
    var insert_data = {};
    insert_data['token'] = token;
    insert_data['user_id'] = username;
    /* Timestamp will be added by default */

    var insert_query = "INSERT INTO cookies SET = ?";
    connection.query(insert_query, insert_data, function(ins_error, ins_result) {
        if (ins_error) {
            log("cookie db or query error")
            res.send("cookie db or query error");
            return;
        }

        var response_data = {};
        response_data['cookie'] = token;
        response_data['name'] = result[0].name;
        response_data['email'] = result[0].email;
        response_data['phone'] = result[0].phone;

        log("login success");

        res.send(response_data);
        return;
    });
}

/*
 * Utility functions
 */
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function log(str) {
    var timestamp = new Date().getTime();
    logFile.write(timestamp + " : " + str + '\n');
}

function verify_cookie(cookie) {
    var select_query = "SELECT * FROM cookies WHERE token = ?";

    connection.query(select_query, cookie, function(err, select_result) {
        if (err) {
            return false;
        } else if (1 < select_result.length) {
            remove_cookie(cookie);
            return false;
        } else if (0 == select_result.length) {
            return false;
        }

        return true;
    });
}

function verify_cookie_for_user(cookie, user_id) {

    if ("" == user_id) {
        return verify_cookie(cookie);
    }

    var select_query = "SELECT * FROM cookies WHERE token = ? AND user_id = ?";
    var select_data = [];
    select_data.push(cookie);
    select_data.push(user_id);

    connection.query(select_query, select_data, function(err, select_result) {
        if (err) {
            return false;
        } else if (0 == select_result.length) {
            log("verify_cookie_for_user: failed cookie = " + cookie + ", user_id = " + user_id);
            return false;
        } else if (1 < select_result.length) {
            log("verify_cookie_for_user: duplicate cookie = " + cookie + ", user_id = " + user_id);
            return false;
        }

        return true;
    });
}

function remove_cookie(cookie) {
    var delete_query = "DELETE FROM cookies WHERE token = ?";

    connection.query(delete_query, cookie, function() {});
}

/* Timer function to verify journal and update project_details */
setInterval(function() {
    log("Project Timeout: started");
    var project_query = "SELECT * FROM project_details";
    connection.query(project_query, function(error, project_result) {
        if (error) {
            log("Timeout: db/error");
            return;
        } else if (0 == project_result.length) {
            log("Project timeout: empty project_result");
            return;
        }

        for (var i = 0; i < project_result.length; i++) {
            var total_amount = project_result[i].amount;
            var journal_query = "SELECT * FROM journal WHERE project_id = ? AND project_updated = 'no'";
            var journal_query_data = [];
            journal_query_data.push(project_result[i].project_uid);
            //log("Project Timeout: query for " + project_result[i].project_uid);
            connection.query(journal_query, journal_query_data, function(j_error, journal_result) {
                if (j_error) {
                    log("Timeout: db/query error 1. error: " + j_error);
                    return;
                } else if (0 == journal_result.length) {
                    //log("project_timeout: empty journal result - project_id = " + this.project_id);
                    return;
                }

                for (var j = 0; j < journal_result.length; j++) {
                    this.total_amount += journal_result[j].amount;
                }

                var insert_query = "UPDATE project_details SET amount = ? WHERE project_uid = ?";
                var insert_data = [];
                insert_data.push(this.total_amount);
                insert_data.push(journal_result[0].project_id);
                connection.query(insert_query, insert_data, function(u_error, update_project_result) {
                    if (u_error) {
                        log("project_timeout: project update error");
                        return;
                    }

                    var update_journal_query = "UPDATE journal SET project_updated = 'yes' WHERE project_id = ? AND project_updated = 'no'";
                    var update_journal_data = [];
                    update_journal_data.push(this.project_id);
                    connection.query(update_journal_query, update_journal_data, function(uj_error, uj_result) {
                        if (uj_error) {
                            log("project_timeout: journal update error");
                            return;
                        }
                    });
                }.bind({ "project_id": journal_result[0].project_id }));
            }.bind({ "total_amount": total_amount, "project_id": project_result[i].project_uid }));
        }
    });
}, 1000 * 60 * 10); //For every 10 minutes