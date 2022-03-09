module.exports = 
`#pragma version 5
txn ApplicationID
int 0
==
bnz main_l22
txn OnCompletion
int DeleteApplication
==
bnz main_l21
txn OnCompletion
int UpdateApplication
==
bnz main_l20
txn OnCompletion
int OptIn
==
bnz main_l19
txna ApplicationArgs 0
byte "set_admin"
==
bnz main_l18
txna ApplicationArgs 0
byte "am_i_admin"
==
bnz main_l17
txna ApplicationArgs 0
byte "set_field"
==
bnz main_l16
txna ApplicationArgs 0
byte "set_status"
==
bnz main_l15
txna ApplicationArgs 0
byte "vote"
==
bnz main_l12
txna ApplicationArgs 0
byte "set_org_id"
==
bnz main_l11
err
main_l11:
byte "admin"
app_global_get
txn Sender
==
assert
byte "org_id"
txna ApplicationArgs 1
btoi
app_global_put
int 1
return
main_l12:
txn Sender
byte "has_voted"
app_local_get
int 0
==
assert
txn Sender
byte "my_vote"
txna ApplicationArgs 1
app_local_put
txn Sender
byte "has_voted"
int 1
app_local_put
txna ApplicationArgs 1
byte "YES"
==
bnz main_l14
main_l13:
int 1
return
main_l14:
byte "votes"
byte "votes"
app_global_get
int 1
+
app_global_put
b main_l13
main_l15:
byte "admin"
app_global_get
txn Sender
==
assert
byte "status"
txna ApplicationArgs 1
btoi
app_global_put
int 1
return
main_l16:
byte "admin"
app_global_get
txn Sender
==
assert
txna ApplicationArgs 1
txna ApplicationArgs 2
app_global_put
int 1
return
main_l17:
byte "admin"
app_global_get
txn Sender
==
return
main_l18:
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
main_l19:
txn Sender
byte "my_vote"
byte "ABSTAIN"
app_local_put
txn Sender
byte "has_voted"
int 0
app_local_put
int 1
return
main_l20:
byte "admin"
app_global_get
txn Sender
==
return
main_l21:
byte "admin"
app_global_get
txn Sender
==
return
main_l22:
txn NumAppArgs
int 5
==
assert
byte "admin"
txn Sender
app_global_put
byte "url"
txna ApplicationArgs 2
app_global_put
byte "title"
txna ApplicationArgs 0
app_global_put
byte "description"
txna ApplicationArgs 1
app_global_put
byte "data"
byte "not set"
app_global_put
byte "org_id"
txna ApplicationArgs 3
btoi
app_global_put
byte "status"
txna ApplicationArgs 4
btoi
app_global_put
byte "votes"
int 0
app_global_put
int 1
return`;