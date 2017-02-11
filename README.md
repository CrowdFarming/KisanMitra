# alpha
Crowd funding for Farmers practising Natural Farming methods

## Objective
* Crowd fund farmers to save them from huge debts.
* Create platform for consumers to fund/buy products grown without pesticides and other chemical

## Design
### UI Pages

	1) Welcome page ( stat, about the project)
	2) User Login
	3) User dashboard
	4) Project list
	5) Project page
  6) Payment page
  
### DB Design
	1) User details
		a. Name, mail id, phone , password, uid
	2) Former details
		a. Name, phone , mail id , pan card , aadhard , address , experience, land , uid
	3) Project
		a. Farmer_uid, type, crop , uid, start mon, end mon, current stage, target fund, price, units, quantity , geo location, blog and gallery , comments.
	4)  fund
		a. Project_uid, user_uid, prices, units , status
			i. Shipping related details
	5) Journal
		a. Date, p_uid , u_uid , price, payment id , payment type, credit
			i. Payment type
				1) Paytm
				2) Goods
			ii. Credit
				1) Yes ( from former)
				2) No ( from user)

### API
	1) POST /Login
		Input
		a. userid : Phoneno or email id
		b. Pass : Password
		
		Returns
		a. JSON Object with
			i. Cookie(unique token string as of now)		[cookie]
			iii. Name of the user 							[name]
			iv. Email 										[email]
			v. Phone number 								[phone]
		b. Error String: "cookie db or query error"
			On error during insertion to cookie table
		c. Error String: "db or query error"
			On error during select query in user_details table
		d. Error String: "duplicate entry"
			If more than one entry present for the username[email/phone] combination

	2) GET /logout
		Input
		a. Cookie

		Returns
		Redirects to home page

	3) GET /projects
		Input
		a. Cookie

		Returns
		a. Array of JSON objects with each objects having
			i. Corp 										[corp]
			ii. Start month									[start_month]
			iii. End month 									[end_month]
			iv. current_stage 								[stage]
			v. Target fund 									[target]
			vi. Minimum amount elegible for returns 		[price]
			vii. Unit in which returns measured 			[unit]
			viii. Quantity of returns 						[quantity]
			ix. Longitude of geo-location 					[longitude]
			x. Latitude of geo-location 					[latitude]
			xi. Amount accumulated 							[amount]
			xii. Farmer id 									[farmer_id]
			xiii. Project id 								[project_id]
			xiv. Type 										[type]
			xv. Comments 									[comments]
			xvi. Blog and gallery 							[blog_and_gallery]
		b. Error strings
			i. Invalid cookie
			ii. database or query error
		
		
	4) GET /project?id='id'
		Input
		a. Cookie
		b. Project ID

		Returns
		a. Array of JSON objects with each objects having
			i. Corp 										[corp]
			ii. Start month									[start_month]
			iii. End month 									[end_month]
			iv. current_stage 								[stage]
			v. Target fund 									[target]
			vi. Minimum amount elegible for returns 		[price]
			vii. Unit in which returns measured 			[unit]
			viii. Quantity of returns 						[quantity]
			ix. Longitude of geo-location 					[longitude]
			x. Latitude of geo-location 					[latitude]
			xi. Amount accumulated 							[amount]
			xii. Farmer id 									[farmer_id]
			xiii. Project id 								[project_id]
			xiv. Type 										[type]
			xv. Comments 									[comments]
			xvi. Blog and gallery 							[blog_and_gallery]
			xvii. Farmer name 								[name]
			xviii. Farmer's phone 							[phone]
			xix. Farmer's email 							[email]
			xx. Farmer's pan 								[pan]
			xxi. Farmer's aadhar number 					[aadhar_no]
			xxii. Farmer's address 							[address]
			xxiii. Farmer's experience 						[experience]
			xxiv. Farmer's land 							[land]
			xxv. Farmer's unique id 						[farmer_id]
		b. Error strings
			i. Invalid cookie
			ii. database or query error
			iii. duplicate entries in project table
			iv. duplicate entries in farmer table
		
	5) GET /journal?user="user_id"
	6) GET /journal?user="user_id"&project="project_id"
	7) GET /journal?project="project_id"
		Input
		a. Cookie
		b. Project ID [optional if user_id is given]
		c. User ID [optional if project_id is given]

		Output
		a. JSON Array of JSON Objects having
			i. Timestamp 									[timestamp]
			ii. Project ID 									[project_id]
			iii. User ID 									[user_id]
			iv. Payment ID 									[payment_id]
			v. Amount 										[amount]
			vi. Payment Type 								[payment_type]
			vii. Credit 									[credit]
		b. Error strings
			i. user_id is not matching with cookie
			ii. user_id and project_id both cannot be empty

### Stack
Backend:
	1) Nodejs - Expressjs
	2) Database - MySQL

FrontEnd:
	1) JS, Bootstarp
	
	
Interface:
	1) REST API

