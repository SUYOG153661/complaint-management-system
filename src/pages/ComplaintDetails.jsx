import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import { PhoneCall, MapPin, AlertTriangle, FileImage, FileText } from 'lucide-react'
import heic2any from 'heic2any'

export default function ComplaintDetails() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [isImage, setIsImage] = useState(true)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [convertedImageUrl, setConvertedImageUrl] = useState(null)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    async function fetchOne() {
      setError('')
      setLoading(true)
      const { data, error: err } = await supabase.from('complaints').select('*, profiles(*)').eq('id', id).single()
      if (err) setError(err.message)
      else {
        setItem(data)
        setReply(data.admin_remark || '')
        setImageLoadError(false)
        setConvertedImageUrl(null)
        setConverting(false)
        
        if (data.image_url) {
          const url = data.image_url.toLowerCase()
          setIsImage(url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.webp') || url.endsWith('.bmp') || url.endsWith('.heic') || url.endsWith('.heif'))
          
          // If it's HEIC, convert it
          if (url.endsWith('.heic') || url.endsWith('.heif')) {
            convertHeicToImage(data.image_url)
          }
        }
      }
      setLoading(false)
    }
    fetchOne()
  }, [id])

  async function convertHeicToImage(url) {
    try {
      setConverting(true)
      const response = await fetch(url)
      const blob = await response.blob()
      const convertedBlob = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.8
      })
      const imageUrl = URL.createObjectURL(Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob)
      setConvertedImageUrl(imageUrl)
    } catch (err) {
      console.error('Error converting HEIC:', err)
      setImageLoadError(true)
    } finally {
      setConverting(false)
  }

  async function handleReply() {
    setSending(true)
    const { error: err } = await supabase.from('complaints').update({ admin_remark: reply }).eq('id', id)
    if (err) setError(err.message)
    else {
      setItem(prev => ({ ...prev, admin_remark: reply }))
    }
    setSending(false)
  }

  if (loading) return (
    <div className="container">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">Loading...</motion.div>
    </div>
  )
  
  if (error) return (
    <div className="container">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card error">{error}</motion.div>
    </div>
  )
  
  if (!item) return (
    <div className="container">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">Not found</motion.div>
    </div>
  )

  const isEmergency = item.category === 'Ragging' || item.priority === 'High';
  let displayDescription = item.description || '';
  let locationLink = null;
  const locationMatch = displayDescription.match(/\n\n📍 (?:Emergency )?Location: (https:\/\/maps\.google\.com\/\?q=[0-9.,-]+)/);
  if (locationMatch) {
    locationLink = locationMatch[1];
    displayDescription = displayDescription.replace(locationMatch[0], '');
  }

  // Determine which image URL to use
  const displayImageUrl = convertedImageUrl || item.image_url;

  return (
    <div className="container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card col" style={{ gap: 16, maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <div className="row" style={{ gap:8, alignItems:'center' }}>
             <Link to={isAdmin ? "/admin" : "/dashboard"} className="btn secondary">← Back</Link>
             <h2>Complaint Details</h2>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.status === 'Pending' ? '#ef4444' : item.status === 'In Progress' ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${item.status === 'Pending' ? '#ef4444' : item.status === 'In Progress' ? '#f59e0b' : '#10b981'}` }} />
            <span className={`badge status ${item.status==='Pending'?'pending':item.status==='In Progress'?'progress':'resolved'}`}>{item.status}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="col" style={{ gap:8, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: '100%' }}>
            <div className="row" style={{ gap: 16, alignItems: 'center' }}>
              {item.profiles?.avatar_url ? (
                <img src={item.profiles.avatar_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} alt="Student" />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {(item.profiles?.name || '?').charAt(0)}
                </div>
              )}
              <div className="col">
                <strong>{item.profiles?.name || 'Unknown Student'}</strong>
                <span className="muted">{item.profiles?.department || 'Department N/A'} • {item.profiles?.student_id || 'ID N/A'}</span>
              </div>
            </div>
          </motion.div>

          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
             <span className="muted">ID: CMP{String(item.id).slice(-3).padStart(3,'0')}</span>
             <span className="muted">{new Date(item.created_at).toLocaleString([], { hour12: true })}</span>
          </div>
          <div className="text-xl font-bold">{item.title}</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge">{item.category}</span>
            {isEmergency && (
              <span className="badge" style={{ background: 'var(--danger)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={14} /> High Priority Emergency
              </span>
            )}
          </div>
        </motion.div>

        {isEmergency && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="card col" style={{ gap: 12, background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)' }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
              <AlertTriangle size={20} />
              <strong style={{ fontSize: '1.1rem' }}>Emergency Actions</strong>
            </div>
            <p className="text-sm muted" style={{ margin: 0 }}>This issue has been flagged as high-priority or ragging. Please take immediate action if necessary.</p>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <a href="tel:100" className="btn danger" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneCall size={16} /> Call Police (100)
              </a>
              {locationLink && (
                <a href={locationLink} target="_blank" rel="noreferrer" className="btn brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} /> View Live Location
                </a>
              )}
            </div>
          </motion.div>
        )}

        {!isEmergency && locationLink && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="row" style={{ marginTop: 8 }}>
            <a href={locationLink} target="_blank" rel="noreferrer" className="btn secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} /> View Attached Location
            </a>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ lineHeight:1.6, whiteSpace:'pre-wrap' }}>
          {displayDescription}
        </motion.div>
        
        {item.image_url && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="col" style={{ gap: 8 }}>
            <strong>Attachment</strong>
            
            <div 
              style={{ 
                width: '100%', 
                background: '#1e293b', 
                borderRadius: '12px', 
                border: '1px solid #334155',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: '20px',
                textAlign: 'center'
              }}
              onClick={() => window.open(item.image_url, '_blank', 'noopener,noreferrer')}
            >
              {converting ? (
                <div style={{ color: '#94a3b8', fontSize: '16px' }}>Converting image...</div>
              ) : (convertedImageUrl || (isImage && !imageLoadError) ? (
                <div>
                  <img 
                    src={displayImageUrl} 
                    alt="Complaint attachment" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px', 
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    onError={() => {
                      console.error('Image load error')
                      setImageLoadError(true)
                    }}
                  />
                  <p style={{ color: '#94a3b8', marginTop: '10px', fontSize: '14px' }}>Click to open in new tab</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'rgba(96, 165, 250, 0.1)', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {isImage ? (
                        <FileImage size={40} color="#60a5fa" />
                      ) : (
                        <FileText size={40} color="#60a5fa" />
                      )}
                    </div>
                    <div>
                      <p style={{ color: 'white', fontSize: '16px', fontWeight: '500', margin: '0' }}>
                        {isImage ? 'Image Attachment' : 'File Attachment'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', margin: '0' }}>
                        Click to view file in new tab
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(item.admin_remark || isAdmin) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ marginTop:16, padding:'16px', background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="row" style={{ gap:8, alignItems:'center', marginBottom:12 }}>
              <span className="icon">💬</span>
              <strong>Admin Reply</strong>
            </div>
            
            {isAdmin ? (
              <div className="col" style={{ gap:12 }}>
                <textarea className="input" rows={4} placeholder="Write a reply to the student..." value={reply} onChange={e => setReply(e.target.value)} style={{ background: 'var(--card)', color: 'var(--text)' }} />
                <div className="row" style={{ justifyContent:'flex-end' }}>
                  <button className="btn brand" onClick={handleReply} disabled={sending}>
                    {sending ? 'Sending...' : 'Update Reply'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color:'var(--text)', lineHeight:1.5 }}>{item.admin_remark}</div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
