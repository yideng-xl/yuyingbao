const app = getApp();

Page({
  data: {
    currentAge: '0-6',
    searchKeyword: '',
    recommendations: {},
    articles: [],
    filteredArticles: [],
    faqs: [],
    showArticleModal: false,
    currentArticle: {}
  },

  onLoad() {
    this.loadKnowledgeData();
  },

  loadKnowledgeData() {
    this.loadRecommendations();
    this.loadArticles();
    this.loadFAQs();
  },

  loadRecommendations() {
    const age = this.data.currentAge;
    const recommendations = app.globalData.knowledgeBase[age];
    
    this.setData({
      recommendations
    });
  },

  loadArticles() {
    const articles = [
      {
        id: 1,
        title: '新生儿喂养指南',
        summary: '详细介绍新生儿喂养的注意事项和技巧，帮助新手父母更好地照顾宝宝。',
        category: '喂养',
        date: '2024-01-15',
        image: '/images/article-newborn-feeding.png',
        content: [
          '新生儿喂养是育儿过程中的重要环节，正确的喂养方式对宝宝的生长发育至关重要。',
          '母乳喂养是最佳选择，母乳中含有丰富的营养物质和抗体，能够增强宝宝的免疫力。',
          '如果选择配方奶喂养，请严格按照说明书配制，注意奶瓶和奶嘴的清洁消毒。',
          '新生儿每天需要喂养8-12次，每次间隔2-3小时，具体频率根据宝宝的需求调整。',
          '观察宝宝的饥饿信号，如吮吸手指、张嘴、哭闹等，及时进行喂养。'
        ]
      },
      {
        id: 2,
        title: '宝宝大便颜色解读',
        summary: '通过观察宝宝大便的颜色和性状，了解宝宝的健康状况。',
        category: '健康',
        date: '2024-01-10',
        image: '/images/article-diaper-guide.png',
        content: [
          '宝宝的大便颜色和性状是反映健康状况的重要指标，父母需要学会观察和判断。',
          '母乳喂养的宝宝，大便通常呈金黄色或黄绿色，质地较软，有酸味。',
          '配方奶喂养的宝宝，大便颜色较深，呈黄褐色，质地较硬，气味较重。',
          '如果大便呈白色、黑色或红色，可能是消化系统出现问题，需要及时就医。',
          '正常的大便频率因人而异，母乳宝宝可能每天多次，配方奶宝宝可能1-3天一次。'
        ]
      },
      {
        id: 3,
        title: '宝宝成长发育里程碑',
        summary: '了解宝宝在不同月龄的发育特点，及时发现发育异常。',
        category: '发育',
        date: '2024-01-05',
        image: '/images/article-growth-chart.png',
        content: [
          '宝宝的成长发育有其规律性，了解各阶段的发育特点有助于及时发现异常。',
          '0-3个月：宝宝开始抬头，会注视人脸，发出咿咿呀呀的声音。',
          '3-6个月：宝宝会翻身，伸手抓物，开始认人，发出更多声音。',
          '6-9个月：宝宝会坐，开始爬行，模仿声音，对陌生人产生警惕。',
          '9-12个月：宝宝会站立，开始学步，理解简单指令，说出第一个词。',
          '如果宝宝在某个阶段没有达到相应的发育水平，建议咨询儿科医生。'
        ]
      },
      {
        id: 4,
        title: '辅食添加指南',
        summary: '科学添加辅食，为宝宝的营养补充提供指导。',
        category: '喂养',
        date: '2024-01-01',
        image: '/images/article-solid-food.png',
        content: [
          '辅食添加是宝宝成长过程中的重要阶段，一般在4-6个月开始。',
          '添加辅食的原则：从少到多，从稀到稠，从细到粗，从单一到多样。',
          '首选辅食：强化铁的婴儿米粉，然后是蔬菜泥、水果泥、肉泥等。',
          '每次只添加一种新食物，观察3-5天无不良反应后再添加下一种。',
          '辅食添加初期，母乳或配方奶仍然是主要的营养来源。',
          '注意观察宝宝对食物的反应，如有过敏症状立即停止并咨询医生。'
        ]
      }
    ];
    
    this.setData({
      articles,
      filteredArticles: articles
    });
  },

  loadFAQs() {
    const faqs = [
      {
        id: 1,
        question: '宝宝每天应该吃多少奶？',
        answer: '宝宝的奶量因年龄而异。0-6个月宝宝每天约需要600-900ml，6-12个月约800-1200ml。具体量要根据宝宝的体重、活动量和个体差异来调整。',
        expanded: false
      },
      {
        id: 2,
        question: '宝宝多久大便一次算正常？',
        answer: '母乳喂养的宝宝可能每天多次大便，也可能几天一次。配方奶宝宝通常1-3天一次。只要宝宝精神状态好，大便性状正常，就不必担心。',
        expanded: false
      },
      {
        id: 3,
        question: '什么时候开始添加辅食？',
        answer: '一般建议在宝宝4-6个月时开始添加辅食。具体时间要看宝宝是否对食物感兴趣，能否坐稳，是否出现咀嚼动作等。',
        expanded: false
      },
      {
        id: 4,
        question: '宝宝发烧怎么办？',
        answer: '如果宝宝体温超过38.5℃，建议及时就医。38.5℃以下可以物理降温，多喝水，保持室内通风。3个月以下宝宝发烧应立即就医。',
        expanded: false
      },
      {
        id: 5,
        question: '宝宝哭闹不止怎么办？',
        answer: '首先检查宝宝是否饿了、尿布是否湿了、是否太热或太冷。如果都不是，可能是肠绞痛、长牙或其他不适，可以尝试安抚或咨询医生。',
        expanded: false
      }
    ];
    
    this.setData({
      faqs
    });
  },

  setAge(e) {
    const age = e.currentTarget.dataset.age;
    this.setData({
      currentAge: age
    });
    this.loadRecommendations();
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    this.filterArticles();
  },

  filterArticles() {
    const { articles, searchKeyword } = this.data;
    
    if (!searchKeyword) {
      this.setData({
        filteredArticles: articles
      });
      return;
    }
    
    const filtered = articles.filter(article => 
      article.title.includes(searchKeyword) || 
      article.summary.includes(searchKeyword) ||
      article.category.includes(searchKeyword)
    );
    
    this.setData({
      filteredArticles: filtered
    });
  },

  viewArticle(e) {
    const id = e.currentTarget.dataset.id;
    const article = this.data.articles.find(a => a.id === id);
    
    if (article) {
      this.setData({
        showArticleModal: true,
        currentArticle: article
      });
    }
  },

  hideArticleModal() {
    this.setData({
      showArticleModal: false,
      currentArticle: {}
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    const faqs = this.data.faqs.map(faq => {
      if (faq.id === id) {
        return { ...faq, expanded: !faq.expanded };
      }
      return faq;
    });
    
    this.setData({
      faqs
    });
  }
});
