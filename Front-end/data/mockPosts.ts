export type Comment = {
  id: string;
  user: string;
  avatar: any;
  content: string;
  likes: number;
  dislikes: number;
  replies?: Comment[];
};

export type Post = {
  id: string;
  username: string;
  avatar: any;
  reputation: number;
  location: string;
  time: string;
  score: number;
  title: string;
  hashtag: string;
  content: string;
  images?: any[];
  video?: any;
  likes: number;
  dislikes: number;
  commentsCount: number;
  shares: number;
  comments: Comment[];
};

export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    username: "Nguyễn Văn A",
    avatar: require('../Uploads/AnhDaiDien.jpg'),
    reputation: 120,
    location: "Đắk Lắk",
    time: "2 giờ trước",
    score: 35,
    title: "Cảnh báo ngập cục bộ",
    hashtag: "canhbao",
    content:
      "Khu vực đường Lê Duẩn đang ngập khá nặng, mọi người di chuyển cẩn thận.",
    images: [
      "https://fastly.picsum.photos/id/1029/200/300.jpg?hmac=VpePgDBTGFZYhRTeOD9o6nCvZB_01SrIHCMMkoZal_A"
    ],
    likes: 40,
    dislikes: 2,
    commentsCount: 3,
    shares: 5,
    comments: [
      {
        id: "c1",
        user: "Trần Thị B",
        avatar: require('../Uploads/AnhDaiDien.jpg'),
        content: "Mình vừa đi qua, đúng là ngập thật.",
        likes: 5,
        dislikes: 0,
        replies: [
          {
            id: "r1",
            user: "Nguyễn Văn A",
            avatar: "https://i.pravatar.cc/150?img=1",
            content: "Cảm ơn bạn đã xác nhận.",
            likes: 2,
            dislikes: 0,
          },
        ],
      },
    ],
  },

  // 3 ảnh (test layout 1 lớn 2 nhỏ)
  {
    id: "2",
    username: "Lê Hoàng",
    avatar: require('../Uploads/AnhDaiDien.jpg'),
    reputation: 80,
    location: "TP HCM",
    time: "5 giờ trước",
    score: 20,
    title: "Tai nạn giao thông",
    hashtag: "giaothong",
    content: "Va chạm giữa 2 xe máy tại ngã tư.",
    images: [
      "https://picsum.photos/400/400?3",
      "https://picsum.photos/400/400?4",
      "https://picsum.photos/400/400?5",
    ],
    likes: 15,
    dislikes: 1,
    commentsCount: 0,
    shares: 2,
    comments: [],
  },

  // 6 ảnh (test overlay +N)
  {
    id: "3",
    username: "Phạm Minh",
    avatar: require('../Uploads/AnhDaiDien.jpg'),
    reputation: 200,
    location: "Hà Nội",
    time: "1 ngày trước",
    score: 90,
    title: "Cháy nhỏ tại khu dân cư",
    hashtag: "hoahoan",
    content: "Đã được khống chế, không có thiệt hại lớn.",
    images: [
      "https://picsum.photos/400/400?6",
      "https://picsum.photos/400/400?7",
      "https://picsum.photos/400/400?8",
      "https://picsum.photos/400/400?9",
      "https://picsum.photos/400/400?10",
      "https://picsum.photos/400/400?11",
    ],
    likes: 120,
    dislikes: 3,
    commentsCount: 5,
    shares: 12,
    comments: [],
  },

  // Không ảnh
  {
    id: "4",
    username: "Admin SafeLink",
    avatar: require('../Uploads/AnhDaiDien.jpg'),
    reputation: 999,
    location: "Toàn quốc",
    time: "3 ngày trước",
    score: 150,
    title: "Hướng dẫn sử dụng nút SOS",
    hashtag: "huongdan",
    content:
      "Khi gặp nguy hiểm, hãy nhấn nút SOS để gửi vị trí tới cơ quan chức năng.",
    images: [],
    likes: 300,
    dislikes: 5,
    commentsCount: 12,
    shares: 50,
    comments: [],
  },
  {
  id: "5",
  username: "SafeLink Media",
  avatar: require('../Uploads/AnhDaiDien.jpg'),
  reputation: 500,
  location: "TP HCM",
  time: "30 phút trước",
  score: 70,
  title: "Cập nhật hiện trường",
  hashtag: "video",
  content: "Video ghi lại tình hình thực tế.",
  video: "https://www.w3schools.com/html/mov_bbb.mp4",
  likes: 90,
  dislikes: 1,
  commentsCount: 4,
  shares: 10,
  comments: [],
},
{
  id: "6",
  username: "SafeLink Media",
  avatar: require('../Uploads/AnhDaiDien.jpg'),
  reputation: 500,
  location: "TP HCM",
  time: "30 phút trước",
  score: 70,
  title: "Cập nhật hiện trường",
  hashtag: "video",
  content: "Video ghi lại tình hình thực tế.",
  video: "https://www.w3schools.com/html/mov_bbb.mp4",
  images: [
      "https://fastly.picsum.photos/id/1029/200/300.jpg?hmac=VpePgDBTGFZYhRTeOD9o6nCvZB_01SrIHCMMkoZal_A",
      "https://picsum.photos/400/400?7",
      "https://picsum.photos/400/400?8",
      "https://picsum.photos/400/400?9",
      "https://picsum.photos/400/400?10",
      "https://picsum.photos/400/400?11",
    ],
  likes: 90,
  dislikes: 1,
  commentsCount: 4,
  shares: 10,
  comments: [],
}
];