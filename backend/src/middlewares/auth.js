import jwt from 'jsonwebtoken';
export function auth(req,res,next){const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({success:false,message:'Vui lòng đăng nhập.'});try{req.user=jwt.verify(token,process.env.JWT_SECRET);next()}catch{return res.status(401).json({success:false,message:'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'})}}
export function admin(req,res,next){if(req.user?.role!=='admin')return res.status(403).json({success:false,message:'Bạn không có quyền thực hiện thao tác này.'});next()}
