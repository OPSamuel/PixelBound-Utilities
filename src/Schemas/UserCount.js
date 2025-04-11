// Schemas/UserCount.js
const { model, Schema } = require("mongoose");

module.exports = model("UserCount", 
    new Schema({
        g: String,      
        u: String,     
        c: {   
            type: Number,
            default: 0
        },
        l: Number  
    }, { 
        timestamps: { 
            createdAt: "f",
            updatedAt: true  
        } 
    })
);