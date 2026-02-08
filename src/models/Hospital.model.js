import mongoose from 'mongoose';
import { User } from './User.model.js'

const hospitalSchema = new mongoose.Schema({
    hospitalName: {
        type: String,
        required: true,
    },

    // Is licenc number and hospital ID are the same??
    hospitalId: {
        type: Number,
        required: true,
    },

    licenseNumber: {
        type: String,
        required: true,
    },

    address:{
        city: String,
        governrate: String,
    },

    contactNumber: String,
})

const Hospital = User.dicriminator('hospital', hospitalSchema);

export default Hospital;