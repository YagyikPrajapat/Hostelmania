var express=require("express");
var app=express();
var bodyparser= require("body-parser");
var passport=require("passport");
var flash= require("connect-flash");
var localstrategy=require("passport-local");
var user=require("./models/user");
var mongoose=require("mongoose");
var methodoverride= require("method-override");

mongoose.connect("mongodb://localhost:27017/my_app", {useNewUrlParser: true , useUnifiedTopology: true})
.then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

  //schema
  var hostelSchema= new mongoose.Schema({
      name:String,
      price:String,
      place:String,
      description:String,
      image:String,
      author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
      comments:[
          {
              type: mongoose.Schema.Types.ObjectId,
              ref:"comment"
          }
      ],
     /* images:[
          {
            type: mongoose.Schema.Types.ObjectId,
            ref:"images"
          }
      ]*/
  });
  var commentSchema= new mongoose.Schema({
    text: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
    
});
/* var imagesSchema= new mongoose.Schema({
     image1: String,
     image2: String,
     image3: String,
     image4: String,
     author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "images"
        },
     image5: String}
 });
  var images= mongoose.model("images", imagesSchema);*/
  var hostel= mongoose.model("hostel", hostelSchema);
  var comment= mongoose.model("comment", commentSchema);


app.use(bodyparser.urlencoded({extended:true}));
app.use(bodyparser.json());
app.set("view engine", "ejs");
app.use(express.static(__dirname+ "/public"));//for css file
app.use(methodoverride("_method"));//for edit and update
app.use(flash());
//for authentication
//passport configuration
app.use(require("express-session")({
    secret:"tyrion is the best character",
    resave:false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

//CURRENT USER
app.use(function(req,res,next){
    res.locals.currentuser = req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    next();
})

app.get("/", function(req,res){
    res.render("home",{currentuser:req.user});
});
app.get("/hostels", function(req,res){
    hostel.find({}, function(err,hostels){
        if(err){
            console.log(err);
        } else{
            res.render("index", {hostels:hostels, currentuser:req.user});
        }
    })
   
})
app.get("/hostels/new",isLoggedIn, function(req,res){
    res.render("new");
})
app.post("/hostels",isLoggedIn, function(req,res){
    var name=req.body.name.toUpperCase();
    var image=req.body.image;
    var price=req.body.price;
    var des= req.body.description;
    var author={
        id: req.user._id,
        username: req.user.username
    };
    var place=req.body.place.toUpperCase();
    var newlap={name:name, image:image,price:price, description:des,place:place, author:author};

    hostel.create(newlap, function(err, hostel){
        if(err){
            console.log(err);
        } else{
           /* hostel.author.id=req.user._id;
                hostel.author.username=req.user.username;
                hostel.save();*/
               
            res.redirect("/hostels");
        }
    })
})
app.get("/hostels/:id/edit",checkhostelownership, function(req,res){
    hostel.findById(req.params.id, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            console.log(req.user._id);
            console.log(hostel.author.id);
            res.render("edit", {hostel:hostel});
        }      
})
   
   
})
app.put("/hostels/:id",checkhostelownership, function(req,res){
    hostel.findByIdAndUpdate(req.params.id,req.body.hostel, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            res.redirect("/hostels/"+req.params.id);
        }
    })
})
app.delete("/hostels/:id",checkhostelownership, function(req,res){
    hostel.findByIdAndRemove(req.params.id, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            res.redirect("/hostels");
        }
    })
})
app.get("/hostels/:id/comments/new",isLoggedIn, function(req,res){
    hostel.findById(req.params.id, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            res.render("comments/new",{hostel:hostel});
        }
    })
})
app.post("/hostels/:id/comments",isLoggedIn, function(req,res){
    hostel.findById(req.params.id, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            comment.create(req.body.comment, function(err,comment){
                if(err){
                    req.flash("error","Something Went Wrong");
                    console.log(err);
                } else{
                    comment.author.id=req.user._id;
                comment.author.username=req.user.username;
                comment.save();
                    hostel.comments.push(comment);
                    hostel.save();
                    req.flash("success","Succesfully Added Comment");
                    res.redirect("/hostels/"+req.params.id);
                }
            })
        }
    })
})

app.get("/hostels/:id/comments/:comment_id/edit",checkcommentownership, function(req,res){
    comment.findById(req.params.comment_id, function(err,comment){
        if(err){
            console.log(err);
        } else{
           
            res.render("comments/edit", {hostel_id:req.params.id,comment:comment});
        }
    })
})
app.put("/hostels/:id/comments/:comment_id",checkcommentownership, function(req,res){
    comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            res.redirect("/hostels/"+req.params.id);
        }
    })
})

app.delete("/hostels/:id/comments/:comment_id",checkcommentownership, function(req,res){
    comment.findByIdAndRemove(req.params.comment_id, function(err,hostel){
        if(err){
            console.log(err);
        } else{
            req.flash("success","Comment Deleted");
            res.redirect("/hostels/"+req.params.id);
        }
    })
})
app.get("/hostels/:id", function(req,res){
    hostel.findById(req.params.id).populate("comments").exec(function(err,hostels) {
        if(err){
            res.redirect("/hostels");
        } else{
            
            res.render("show", {hostels:hostels});
        }
    })
})
/*app.get("/hostels/:id/images/:images_id", function(req,res){
    hostel.findById(req.params.id,function(err,hostels){
        if(err){
            console.log(err);
        } else{
           images.findById(req.params.images_id, function(err,images){
               if(err){
                   console.log(err);
               } else{
                   res.render("/info/show1", {images:images, hostels:hostels});
               }
           })
        }
    })
})*/
//AUTH ROUTES
app.get("/register", function(req,res){
    res.render("register");
});
app.post("/register", function(req,res){
    var newuser=new user({username: req.body.username});
    user.register(newuser, req.body.password, function(err,user){
        if(err){
            req.flash("error",err.message);
            res.redirect("back");
        } else{
            req.flash("success","Welcome To Hostelmania "+ user.username);
            passport.authenticate("local")(req,res,function(){
                res.redirect("/hostels");
            })
        }
    })
});

app.get("/login", function(req,res){
    req.flash("success","You are Logged In");
    res.render("login");
});
app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/hostels",
        failureRedirect: "/login"
    }), function(req,res){

    });

    app.get("/logout", function(req,res){
        req.logout();
        req.flash("success","Successfully Logged Out");
        res.redirect("/hostels");
    });

    //middleware
    function isLoggedIn(req,res,next){
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error","You Need To Be Looged In")
        res.redirect("/login");
    }

    function checkhostelownership(req,res,next){
        if(req.isAuthenticated()){
            hostel.findById(req.params.id,  function(err,foundhostel){
                if(err){
                    req.flash("error","Hostel Not Found");
                    res.redirect("back");
                }  else{
                    if(foundhostel.author.id.equals(req.user._id)){
                     next();
                    } else{
                        req.flash("error","Permission Denied");
                        res.redirect("back");
                    }
                }
            })} else{
                req.flash("error", "You Need To Be Logged In");
                res.redirect("back");}
    }
    function checkcommentownership(req,res,next){
        if(req.isAuthenticated()){
            comment.findById(req.params.comment_id,  function(err,foundcomment){
                if(err){
                    req.flash("error","Hostel Not Found");
                    res.redirect("back");
                }  else{
                    if(foundcomment.author.id.equals(req.user._id)){
                     next();
                    } else{
                        req.flash("error","Permission Denied");
                        res.redirect("back");
                    }
                }
            })} else{
                req.flash("error", "You Need To Be Logged In");
                res.redirect("back");}
    }
    

app.listen(3000, process.env.IP, function(){
    console.log("Server  Started");
})
