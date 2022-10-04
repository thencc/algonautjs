module.exports =
	`#pragma version 5
txn ApplicationID
int 0
==
bnz main_l18
txn OnCompletion
int DeleteApplication
==
bnz main_l17
txn OnCompletion
int UpdateApplication
==
bnz main_l16
txn OnCompletion
int OptIn
==
bnz main_l15
txna ApplicationArgs 0
byte "set_admin"
==
bnz main_l14
txna ApplicationArgs 0
byte "am_i_admin"
==
bnz main_l13
txna ApplicationArgs 0
byte "set_field"
==
bnz main_l12
txna ApplicationArgs 0
byte "set_all"
==
bnz main_l11
txna ApplicationArgs 0
byte "version_test"
==
bnz main_l10
err
main_l10:
txn Sender
byte "version"
byte "two"
app_local_put
int 1
return
main_l11:
txn Sender
byte "name"
txna ApplicationArgs 1
app_local_put
txn Sender
byte "bio"
txna ApplicationArgs 2
app_local_put
txn Sender
byte "avatar"
txna ApplicationArgs 3
app_local_put
txn Sender
byte "link"
txna ApplicationArgs 4
app_local_put
txn Sender
byte "md_url"
txna ApplicationArgs 5
app_local_put
txn Sender
byte "contact"
txna ApplicationArgs 6
app_local_put
int 1
return
main_l12:
txn Sender
txna ApplicationArgs 1
txna ApplicationArgs 2
app_local_put
int 1
return
main_l13:
byte "admin"
app_global_get
txn Sender
==
return
main_l14:
byte "admin"
app_global_get
txn Sender
==
assert
byte "admin"
txna Accounts 1
app_global_put
int 1
return
main_l15:
txn Sender
byte "name"
txna ApplicationArgs 1
app_local_put
txn Sender
byte "bio"
txna ApplicationArgs 2
app_local_put
txn Sender
byte "avatar"
txna ApplicationArgs 3
app_local_put
txn Sender
byte "link"
txna ApplicationArgs 4
app_local_put
txn Sender
byte "md_url"
txna ApplicationArgs 5
app_local_put
txn Sender
byte "contact"
txna ApplicationArgs 6
app_local_put
int 1
return
main_l16:
byte "admin"
app_global_get
txn Sender
==
return
main_l17:
byte "admin"
app_global_get
txn Sender
==
return
main_l18:
txn NumAppArgs
int 0
==
assert
byte "admin"
txn Sender
app_global_put
int 1
return`;